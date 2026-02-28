import os
import mimetypes
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List

router = APIRouter()

# The base directory where user files are stored
MYFILES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "myfiles")

# Ensure the directory exists
os.makedirs(MYFILES_DIR, exist_ok=True)

class FileInfo(BaseModel):
    name: str
    size: int
    type: str # 'image', 'video', 'pdf', 'document', 'unknown'
    url: str

def get_file_category(mime_type: str, ext: str) -> str:
    if mime_type:
        if mime_type.startswith('image/'):
            return 'image'
        if mime_type.startswith('video/'):
            return 'video'
        if mime_type == 'application/pdf':
            return 'pdf'
            
    # Fallback to extensions for documents and text
    doc_exts = ['.doc', '.docx', '.txt', '.md', '.csv', '.xlsx', '.xls', '.ppt', '.pptx']
    if ext.lower() in doc_exts:
        return 'document'
        
    return 'unknown'

@router.get("/list", response_model=List[FileInfo])
def list_files():
    """Lists all files available in the MyFiles directory."""
    files_list = []
    
    try:
        for filename in os.listdir(MYFILES_DIR):
            filepath = os.path.join(MYFILES_DIR, filename)
            
            # Skip directories, only list files
            if os.path.isfile(filepath):
                size = os.path.getsize(filepath)
                mime_type, _ = mimetypes.guess_type(filepath)
                _, ext = os.path.splitext(filename)
                
                category = get_file_category(mime_type, ext)
                
                files_list.append(FileInfo(
                    name=filename,
                    size=size,
                    type=category,
                    url=f"/api/files/view/{filename}"
                ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return files_list

@router.get("/view/{filename}")
def view_file(filename: str):
    """Serves the actual file content for streaming or viewing."""
    filepath = os.path.join(MYFILES_DIR, filename)
    
    # Security: Prevent path traversal attacks
    if not os.path.abspath(filepath).startswith(os.path.abspath(MYFILES_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(filepath)
