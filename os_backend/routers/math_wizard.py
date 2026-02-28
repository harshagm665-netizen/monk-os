import os
import io
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from groq import AsyncGroq
from PIL import Image as PILImage
from functools import wraps
import logging

router = APIRouter()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- Error Controller Wrapper (Agent 6 Pattern) ---
def agent_6_error_controller(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logging.error(f"[Math Wizard] Error caught in {func.__name__}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Math Wizard Error: {str(e)}")
    return wrapper

@router.get("/generate-quiz")
@agent_6_error_controller
async def generate_math_quiz():
    """
    Generates a simple, elementary-school level math question dynamically using Llama-3.
    """
    print("[Math Wizard] Generating new quiz question...")
    client = AsyncGroq(api_key=GROQ_API_KEY)
    
    prompt = """
    You are an elementary school math teacher.
    Generate exactly ONE simple math problem (addition, subtraction, or basic multiplication).
    For example: "What is 15 + 8?", "Solve 24 - 7", or "What is 3 times 4?".
    Do NOT include the answer. Return ONLY the question string, nothing else.
    """

    response = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",  # Updated to active Groq text model
        temperature=0.9,
        max_tokens=50,
    )
    
    question = response.choices[0].message.content.strip()
    # Strip quotes if the model wrapped the question in them
    if question.startswith('"') and question.endswith('"'):
        question = question[1:-1]
        
    print(f"[Math Wizard] Generated: {question}")
    return {"question": question}


@router.post("/evaluate")
@agent_6_error_controller
async def evaluate_math_problem(
    file: UploadFile = File(...),
    expected_question: str = Form(None)
):
    """
    Receives an image of a handwritten math problem or answer.
    Uses LLaMA Vision (Groq) to read, solve, and grade it.
    If expected_question is provided, it acts in "Quiz Mode" to verify the answer against that question.
    """
    print(f"[Math Wizard] Received image: {file.filename}")
    content = await file.read()

    # Determine MIME type
    ext = file.filename.split('.')[-1].lower()
    mime = "image/jpeg"
    if ext == "png": mime = "image/png"
    elif ext == "webp": mime = "image/webp"

    # Optimize Image
    img = PILImage.open(io.BytesIO(content))
    img.thumbnail((800, 800))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=80)
    optimized_content = buffer.getvalue()
    
    # Encode Base64
    b64 = base64.b64encode(optimized_content).decode()
    image_url = f"data:{mime};base64,{b64}"

    print(f"[Math Wizard] Calling LLaMA Vision. Mode: {'Quiz' if expected_question else 'Free Scan'}")
    client = AsyncGroq(api_key=GROQ_API_KEY)
    
    if expected_question:
        prompt = f"""
        You are a friendly, encouraging math teacher for an elementary school student.
        I just asked the student this question out loud: "{expected_question}"
        Look at the handwritten answer on this paper piece in the image.
        1. Tell me if the student wrote the correct answer to that specific question.
        2. If they are wrong, explain how to arrive at the correct answer step-by-step.
        3. Keep your response very brief (2-3 sentences max) so it can be read aloud by a robot.
        4. Always start with a positive greeting like "Great job!" or "Let's look at this together!"
        """
    else:
        prompt = """
        You are a friendly, encouraging math teacher for an elementary school student.
        Look at the handwritten math problem in this image.
        1. Read the problem.
        2. Tell me if the student got the answer right or wrong.
        3. If they are wrong, explain how to get the right answer step-by-step.
        4. Keep your response very brief (2-3 sentences max) so it can be read aloud by a robot.
        5. Always start with a positive greeting like "Great job!" or "Let's look at this together!"
        """

    response = await client.chat.completions.create(
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        }],
        model="meta-llama/llama-4-maverick-17b-128e-instruct", # Utilizing the Maverick vision model
        temperature=0.7,
        max_tokens=200,
    )
    
    feedback = response.choices[0].message.content
    print(f"[Math Wizard] Grading complete: {feedback}")
    
    return {"feedback": feedback}
