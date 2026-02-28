from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from groq import AsyncGroq
import json
import logging
import os
import fitz  # PyMuPDF
import io
import base64
from PIL import Image as PILImage
from functools import wraps
from datetime import datetime
from database import SessionLocal, Student, QuizResult

router = APIRouter()

# Initialize Groq with the User's Key from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class LearnRequest(BaseModel):
    document_text: str

class AnswerCheckRequest(BaseModel):
    question: str
    selected_answer: str
    correct_answer: str

class ScoreSaveRequest(BaseModel):
    student_name: str
    topic: str
    score: int
    total: int

# --- AGENT 6: Error Controller / Debugger ---
# Wraps execution, logs to console, and manages controlled failures
def agent_6_error_controller(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logging.error(f"[Agent 6 - System Debugger] Error caught in {func.__name__}: {str(e)}")
            # Restart or fallback logic could be triggered here
            raise HTTPException(status_code=500, detail=f"Agent Failure: {str(e)}")
    return wrapper

# --- AGENT 1: Curriculum Builder ---
async def agent_1_extract_topics_and_questions(text: str):
    import re
    print("[Leader] Delegating to Agent 1: Content Extraction & Quiz Generation (Groq)...")
    client = AsyncGroq(api_key=GROQ_API_KEY)
    prompt = f"""
    Task: Extract up to 5 major topics from this text. For each topic, create exactly 8 multiple-choice questions suitable for 1st-3rd grade students.
    Text: {text}
    
    Return EXACTLY this JSON structure, and nothing else:
    {{
        "topics": [
            {{
                "concept": "Topic Name",
                "questions": [
                    {{
                        "question": "Question text?",
                        "options": ["A", "B", "C", "D"],
                        "correct_index": 0
                    }}
                ]
            }}
        ]
    }}
    """
    
    response = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",
        temperature=0.2,
        max_tokens=8000
    )
    raw_text = response.choices[0].message.content
    
    # Safely extract JSON block using regex
    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match:
        raw_json = match.group(0)
    else:
        raw_json = raw_text.replace('```json', '').replace('```', '').strip()
        
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as e:
        print(f"[Agent 1 Error] JSON Decode Failed: {e}. Raw text snippet: {raw_text[-200:]}")
        # Return a safe fallback so the frontend doesn't hit a 500 error
        return {"topics": [{"concept": "Error Parsing Content", "questions": [{"question": "Document was too complex. Try a smaller text?", "options": ["OK", "Try Again", "Close", "Skip"], "correct_index": 0}]}]}

# --- AGENT 2: Visual Prompt Architect ---
async def agent_2_generate_image_prompts(topics_data: dict):
    print("[Leader] Delegating to Agent 2: Visual Architect Image Prompts (Batched Groq)...")
    import json
    import re
    
    client = AsyncGroq(api_key=GROQ_API_KEY)
    topics = topics_data.get("topics", [])
    
    if not topics:
        return topics_data
        
    concepts = [t.get("concept", "") for t in topics]
    
    prompt = f"""
    Create a Stable Diffusion style image prompt for each of these concepts: {concepts}.
    Target audience: 1st-3rd grade children.
    Constraints: Must mention 'white background', 'vector art', and 'bright colors'. 
    
    Return EXACTLY a JSON list of strings, in the exact same order as the concepts.
    Example: [ "Prompt 1", "Prompt 2" ]
    """
    
    try:
        response = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=2000
        )
        raw_text = response.choices[0].message.content
        
        # Safely extract JSON array
        match = re.search(r'\[.*\]', raw_text, re.DOTALL)
        if match:
            prompts_list = json.loads(match.group(0))
        else:
            prompts_list = json.loads(raw_text.replace('```json', '').replace('```', '').strip())
            
        for i, topic in enumerate(topics):
            topic["image_prompt"] = prompts_list[i] if i < len(prompts_list) else "Cute vector art, bright colors, white background."
            topic["robot_speech"] = f"Let's learn about {topic.get('concept', '')}! Can you answer this? "
            
    except Exception as e:
        print(f"[Agent 2] Error generating prompts: {e}")
        # Fallback if the batch fails
        for topic in topics:
            topic["image_prompt"] = "Educational cute vector art, bright colors, white background."
            topic["robot_speech"] = f"Let's learn about {topic.get('concept', '')}! Can you answer this? "
            
    return topics_data

# --- LEADER AGENT: Master Orchestrator ---
@router.post("/learn")
@agent_6_error_controller
async def leader_agent_orchestrate(request: LearnRequest):
    """
    Leader Agent receives the document, coordinates Agent 1 and Agent 2, 
    and returns the compiled curriculum to the frontend.
    """
    print(f"\n[Leader] Received new study material ({len(request.document_text)} chars). Initiating Pipeline.")
    
    # Step 1: Route to Agent 1
    quiz_data = await agent_1_extract_topics_and_questions(request.document_text)
    
    # Step 2: Route to Agent 2
    final_curriculum = await agent_2_generate_image_prompts(quiz_data)
    
    print("[Leader] Pipeline Complete. Sending data to UI.")
    return {"curriculum": final_curriculum}

# --- AGENT 1b: Vision/Document Extractor ---
@router.post("/upload-learn")
@agent_6_error_controller
async def upload_learn_agent(file: UploadFile = File(...)):
    """Receives a raw file (PDF, image, txt) and extracts text for the Quiz Agents"""
    content = await file.read()
    ext = file.filename.split('.')[-1].lower() if file.filename else ""
    mime = file.content_type or ""
    
    text = ""
    print(f"[Agent 1b] Extracting text from uploaded file: {file.filename} ({len(content)} bytes)")
    
    if "pdf" in ext or "pdf" in mime:
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            text += page.get_text()
        doc.close()
    elif "text" in mime or ext in ["txt", "md", "csv"]:
        text = content.decode("utf-8")
    elif "image" in mime or ext in ["png", "jpg", "jpeg"]:
        # Use Groq Vision to extract text from image
        print(f"[Agent 1b] Querying Groq Vision Model...")
        client = AsyncGroq(api_key=GROQ_API_KEY)
        b64 = base64.b64encode(content).decode()
        image_url = f"data:{mime or 'image/jpeg'};base64,{b64}"
        
        response = await client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all text, concepts, and study material visible in this image. Write it as a clear study document."},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }],
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
        )
        text = response.choices[0].message.content
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format.")
        
    print(f"[Agent 1b] Extracted {len(text)} chars from {file.filename}. Triggering Leader...")
    # Pass the extracted text to the main orchestrator (re-use the logic)
    
    request = LearnRequest(document_text=text)
    # Step 1: Route to Agent 1
    quiz_data = await agent_1_extract_topics_and_questions(request.document_text)
    # Step 2: Route to Agent 2
    final_curriculum = await agent_2_generate_image_prompts(quiz_data)
    
    return {"curriculum": final_curriculum}

# --- AGENT 5: Evaluator ---
@router.post("/check-answer")
@agent_6_error_controller
async def agent_5_evaluator(request: AnswerCheckRequest):
    """
    Agent 5 checks if the user's answer is correct and generates 
    an encouraging teacher-like response.
    """
    print(f"[Leader] Delegating to Agent 5: Checking Answer...")
    is_correct = request.selected_answer.strip().lower() == request.correct_answer.strip().lower()
    
    if is_correct:
        feedback = "Amazing job, superstar! You got it right! 🎉"
    else:
        feedback = f"Oh, nice try! But the correct answer was actually {request.correct_answer}. You'll get it next time! 💪"
        
    return {
        "is_correct": is_correct,
        "feedback": feedback
    }

@router.post("/save-score")
def save_quiz_score(req: ScoreSaveRequest):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.name == req.student_name).first()
        if not student:
            # Auto-enroll
            student = Student(name=req.student_name, grade="Auto-Enrolled")
            db.add(student)
            db.commit()
            db.refresh(student)
            
        today = datetime.now().strftime("%Y-%m-%d")
        qr = QuizResult(student_id=student.id, topic=req.topic, score=req.score, total=req.total, date=today)
        db.add(qr)
        db.commit()
        return {"success": True, "message": "Score saved to SQLite"}
    except Exception as e:
        print(f"[Smart Killer] Error saving score: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
