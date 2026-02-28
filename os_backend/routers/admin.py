from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db, Student, Attendance, QuizResult
from pydantic import BaseModel

router = APIRouter()

class StudentCreate(BaseModel):
    name: str
    grade: str = "Unassigned"
    face_id: str = None

@router.get("/students")
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return students

@router.post("/students")
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    db_student = Student(name=student.name, grade=student.grade, face_id=student.face_id)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"message": "Deleted"}

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Calculate total students
    total_students = db.query(Student).count()
    
    # Calculate present today
    present_today = db.query(Attendance).filter(
        Attendance.date == today,
        Attendance.status == "Present"
    ).count()

    # Get recent quiz scores (last 10)
    recent_quizzes = db.query(QuizResult).order_by(QuizResult.id.desc()).limit(10).all()
    
    quiz_data = []
    for q in recent_quizzes:
        student = db.query(Student).filter(Student.id == q.student_id).first()
        quiz_data.append({
            "id": q.id,
            "student_name": student.name if student else "Unknown",
            "topic": q.topic,
            "score": q.score,
            "total": q.total,
            "date": q.date
        })

    return {
        "stats": {
            "total_students": total_students,
            "present_today": present_today,
            "date": today
        },
        "recent_activity": quiz_data
    }
