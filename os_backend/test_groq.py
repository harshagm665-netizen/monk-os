import os, base64, time
from dotenv import load_dotenv

load_dotenv()
import groq
from PIL import Image as PILImage
import io

GROQ_KEY = os.getenv("GROQ_API_KEY")
GROQ_VISION_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct"

def test_vision():
    # Make a dummy 500x500 red image to test
    img = PILImage.new('RGB', (500, 500), color='red')
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    out.seek(0)
    
    b64 = base64.b64encode(out.read()).decode()
    image_url = f"data:image/jpeg;base64,{b64}"
    
    print("Sending request to Groq...")
    client = groq.Groq(api_key=GROQ_KEY)
    
    try:
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What color is this image?"},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            model=GROQ_VISION_MODEL,
        )
        print("Response:", response.choices[0].message.content)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test_vision()
