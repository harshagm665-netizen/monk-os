from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import vision, voice, rag, smart_killer

app = FastAPI(title="Monk OS Backend (Pi 5 AI Core)", version="3.0.0")

# Allow React frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Monk OS AI Core is running globally across Windows/Pi environments."}

# Mount endpoints
app.include_router(vision.router, prefix="/api/vision", tags=["Vision"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(smart_killer.router, prefix="/api/smart-killer", tags=["Smart Killer AI"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
