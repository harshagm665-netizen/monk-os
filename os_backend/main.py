from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()  # Safely load local API keys from .env

from routers import vision, voice, rag, smart_killer, admin, math_wizard, hardware, files
import database

# Initialize SQLite Database Tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Monk OS Backend (Pi 5 AI Core)", version="3.0.0")

# Allow React frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount endpoints
app.include_router(vision.router, prefix="/api/vision", tags=["Vision"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(smart_killer.router, prefix="/api/smart-killer", tags=["Smart Killer AI"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin Dashboard"])
app.include_router(math_wizard.router, prefix="/api/math-wizard", tags=["Math Wizard Tutoring"])
app.include_router(hardware.router, prefix="/api/hardware", tags=["Robot Hardware Bridge"])
app.include_router(files.router, prefix="/api/files", tags=["MyFiles Explorer"])

# STATIC SERVING: Serve the compiled React Frontend strictly from the Pi's Python backend
# This eliminates the need for `npm run dev` and Node.js on the Edge, saving massive CPU load.
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__main__.__file__ if '__main__' in str(globals()) else __file__))), "dist")

if os.path.exists(FRONTEND_BUILD_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD_DIR, "assets")), name="assets")
    
    # Catch-all to serve index.html for React Router compatibility
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Prevent intercepting valid API calls if they somehow missed a router
        if full_path.startswith("api"):
            return {"error": "API route not found"}
            
        file_path = os.path.join(FRONTEND_BUILD_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"status": "Monk OS AI Core running. (Frontend dist not found, build it first!)"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
