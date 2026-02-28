import cv2
import base64
import numpy as np
import os
import json
import uuid
import asyncio
import urllib.request
import threading
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, Student, Attendance

router = APIRouter()

FACES_DIR  = "data/faces"
LABELS_FILE = "data/face_labels.json"
os.makedirs(FACES_DIR, exist_ok=True)

# ──────────────────────────────────────────────
# Single global lock for ALL cv2.dnn operations
# cv2.dnn.Net is NOT thread-safe; must serialize
# ──────────────────────────────────────────────
dnn_lock       = threading.Lock()
recognizer_lock = threading.Lock()

# ──────────────────────────────────────────────
# DNN Face Detector — auto-download weights
# ──────────────────────────────────────────────
MODEL_DIR    = "data/models"
os.makedirs(MODEL_DIR, exist_ok=True)
PROTO_PATH   = os.path.join(MODEL_DIR, "deploy.prototxt")
WEIGHTS_PATH = os.path.join(MODEL_DIR, "res10_300x300_ssd_iter_140000.caffemodel")

PROTO_URL   = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
WEIGHTS_URL = "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"

def _ensure_model():
    if not os.path.exists(PROTO_PATH):
        print("[Vision] Downloading deploy.prototxt …")
        urllib.request.urlretrieve(PROTO_URL, PROTO_PATH)
    if not os.path.exists(WEIGHTS_PATH):
        print("[Vision] Downloading SSD weights (~10 MB) …")
        urllib.request.urlretrieve(WEIGHTS_URL, WEIGHTS_PATH)

_ensure_model()
dnn_net = cv2.dnn.readNetFromCaffe(PROTO_PATH, WEIGHTS_PATH)

# Haar Cascade fallback (always available in OpenCV)
haar = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def get_faces(frame, conf_threshold: float = 0.4):
    """
    1. Apply CLAHE to handle backlit / low-contrast faces.
    2. Try DNN (SSD) first — most accurate.
    3. Fallback to Haar Cascade if DNN finds nothing.
    Returns list of (x, y, w, h).
    """
    h_img, w_img = frame.shape[:2]

    # CLAHE on luminance channel for backlit tolerance
    lab  = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    lab   = cv2.merge([clahe.apply(l), a, b])
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # ── DNN stage (serialised with dnn_lock) ──
    with dnn_lock:
        blob = cv2.dnn.blobFromImage(
            cv2.resize(enhanced, (300, 300)), 1.0, (300, 300),
            (104, 117, 123), swapRB=False
        )
        dnn_net.setInput(blob)
        detections = dnn_net.forward()

    boxes = []
    for i in range(detections.shape[2]):
        confidence = float(detections[0, 0, i, 2])
        if confidence > conf_threshold:
            box = detections[0, 0, i, 3:7] * np.array([w_img, h_img, w_img, h_img])
            x1, y1, x2, y2 = box.astype("int")
            x, y = max(0, x1), max(0, y1)
            w = min(w_img - x, x2 - x1)
            h = min(h_img - y, y2 - y1)
            if w > 20 and h > 20:
                boxes.append((x, y, w, h))

    # ── Haar fallback ──
    if not boxes:
        gray_enhanced = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
        haar_faces = haar.detectMultiScale(gray_enhanced, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))
        for (x, y, w, h) in haar_faces:
            boxes.append((int(x), int(y), int(w), int(h)))

    return boxes

# ──────────────────────────────────────────────
# LBPH Recognizer
# ──────────────────────────────────────────────
recognizer    = cv2.face.LBPHFaceRecognizer_create()
label_to_name: dict = {}
model_trained = False

def _retrain_from_disk():
    global label_to_name, model_trained
    if os.path.exists(LABELS_FILE):
        with open(LABELS_FILE) as f:
            label_to_name = {int(k): v for k, v in json.load(f).items()}

    faces, labels = [], []
    for filename in sorted(os.listdir(FACES_DIR)):
        if not filename.endswith(".jpg"):
            continue
        name     = filename.rsplit("_", 1)[0]
        label_id = next((k for k, v in label_to_name.items() if v == name), None)
        if label_id is None:
            label_id = len(label_to_name)
            label_to_name[label_id] = name

        img = cv2.imread(os.path.join(FACES_DIR, filename), cv2.IMREAD_GRAYSCALE)
        if img is not None and img.size > 0:
            faces.append(cv2.resize(img, (100, 100)))
            labels.append(label_id)

    if faces:
        recognizer.train(faces, np.array(labels))
        model_trained = True
        with open(LABELS_FILE, "w") as f:
            json.dump(label_to_name, f)
        print(f"[Vision] Trained on {len(faces)} face(s): {list(set(label_to_name.values()))}")
    else:
        model_trained = False
        print("[Vision] No saved faces — learning-ready state.")

with recognizer_lock:
    _retrain_from_disk()

# ──────────────────────────────────────────────
# REST: Register face
# ──────────────────────────────────────────────
class RegisterFaceReq(BaseModel):
    name: str
    image_base64: str

@router.post("/register")
async def register_face(req: RegisterFaceReq):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _do_register, req.name, req.image_base64)

def _do_register(name: str, image_base64: str):
    try:
        header, encoded = image_base64.split(",", 1)
        img_data = base64.b64decode(encoded)
        nparr    = np.frombuffer(img_data, np.uint8)
        frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"success": False, "error": "Could not decode image."}

        boxes = get_faces(frame)
        if not boxes:
            return {"success": False, "error": "No face detected — ensure good lighting and face the camera."}

        x, y, w, h = max(boxes, key=lambda b: b[2] * b[3])
        gray        = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_roi    = cv2.resize(gray[y:y+h, x:x+w], (100, 100))

        face_id  = str(uuid.uuid4())[:8]
        filepath = os.path.join(FACES_DIR, f"{name}_{face_id}.jpg")
        cv2.imwrite(filepath, face_roi)
        print(f"[Vision] Saved: {filepath}")

        with recognizer_lock:
            _retrain_from_disk()

        return {"success": True, "message": f"✓ {name} registered!"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ──────────────────────────────────────────────
# WebSocket: Live video feed with recognition
# ──────────────────────────────────────────────

_daily_attendance_cache = set() # Store as "YYYY-MM-DD_studentId" to prevent spamming DB

def _log_attendance(db: Session, student_id: int):
    today = datetime.now().strftime("%Y-%m-%d")
    cache_key = f"{today}_{student_id}"
    
    if cache_key in _daily_attendance_cache:
        return
        
    # Check DB to be safe (in case cache cleared)
    existing = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.date == today
    ).first()
    
    if not existing:
        time_now = datetime.now().strftime("%H:%M:%S")
        record = Attendance(student_id=student_id, date=today, status="Present", time=time_now)
        db.add(record)
        db.commit()
        print(f"[Attendance] Successfully logged {student_id} as Present at {time_now}")
    
    _daily_attendance_cache.add(cache_key)

# Keep track of frames for skip-framing
_frame_counter = 0

def _process_frame(data: str):
    global _frame_counter
    try:
        # Increment and check if we should skip heavy processing
        _frame_counter += 1
        if _frame_counter % 5 != 0:
            return [] # Skip 4 out of 5 frames to save CPU heat on the Pi
            
        img_data = base64.b64decode(data.split(",")[1])
        nparr    = np.frombuffer(img_data, np.uint8)
        frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return []
            
        # Downscale the frame directly to reduce LBPH computation load drastically
        frame = cv2.resize(frame, (320, 240))

        boxes = get_faces(frame)
        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        results = []
        for (x, y, w, h) in boxes:
            name     = "Unknown"
            face_roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))

            with recognizer_lock:
                if model_trained:
                    try:
                        label_id, confidence = recognizer.predict(face_roi)
                        print(f"[Vision] predict → label={label_id} conf={confidence:.1f}")
                        if confidence < 110:          # generous threshold for varied light
                            name = label_to_name.get(label_id, "Unknown")
                            
                            # **NEW: Log SQLite Attendance If Detected**
                            if name != "Unknown":
                                db = SessionLocal()
                                try:
                                    # Find student by name
                                    student = db.query(Student).filter(Student.name == name).first()
                                    if student:
                                        _log_attendance(db, student.id)
                                    else:
                                        # Auto-create phantom student in SQL if FaceRec folder had them but DB didn't
                                        new_student = Student(name=name, grade="Auto-Enrolled")
                                        db.add(new_student)
                                        db.commit()
                                        db.refresh(new_student)
                                        _log_attendance(db, new_student.id)
                                        
                                finally:
                                    db.close()
                                    
                    except Exception as e:
                        print(f"[Vision] predict error: {e}")

            # Rescale the results back up assuming a standard 640x480 frontend feed
            # 640 / 320 = 2.0 scale multiplier
            results.append({
                "box":     {"x": int(x * 2), "y": int(y * 2), "w": int(w * 2), "h": int(h * 2)},
                "name":    name,
                "emotion": "Neutral"
            })
        return results
    except Exception as e:
        print(f"[Vision] frame error: {e}")
        return []

@router.websocket("/ws/video-feed")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()
    try:
        while True:
            data  = await websocket.receive_text()
            faces = await loop.run_in_executor(None, _process_frame, data)
            await websocket.send_json({"faces": faces})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Vision WS] {e}")
