from sqlalchemy import create_engine, Column, Integer, String, Date, ForeignKey, Float
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = "sqlite:///./monk_os.db"

# Create Database Engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Models
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    face_id = Column(String, unique=True, index=True, nullable=True) # ID from FaceRec
    grade = Column(String, default="Unassigned")

    attendance = relationship("Attendance", back_populates="student")
    quiz_results = relationship("QuizResult", back_populates="student")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date = Column(String, index=True) # Storing as YYYY-MM-DD
    status = Column(String, default="Present") # Present, Absent, Late
    time = Column(String) # HH:MM:SS

    student = relationship("Student", back_populates="attendance")

class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    topic = Column(String)
    score = Column(Integer)
    total = Column(Integer)
    date = Column(String)

    student = relationship("Student", back_populates="quiz_results")

# Dependency for FastAPI routers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
