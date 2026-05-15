import os
import shutil
from fastapi import UploadFile
from backend.core.database import DATA_DIR

BASE_UPLOADS_DIR = os.path.join(DATA_DIR, 'uploads')

def save_uploaded_file(uploaded_file: UploadFile, folder_name: str, identifier: str, suffix: str) -> str:
    """
    Saves an uploaded file to the specified subfolder within uploads.
    returns: Relative path to the file (e.g., 'uploads/cvs/EMP001_cv.pdf') or None
    """
    if not uploaded_file: 
        return None
    
    # Create directory
    folder_path = os.path.join(BASE_UPLOADS_DIR, folder_name)
    os.makedirs(folder_path, exist_ok=True)
    
    # Construct filename
    ext = os.path.splitext(uploaded_file.filename)[1]
    safe_id = identifier.replace('/', '_').replace('\\', '_').strip()
    filename = f"{safe_id}_{suffix}{ext}"
    filepath = os.path.join(folder_path, filename)
    
    # Save file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(uploaded_file.file, buffer)
        return f"uploads/{folder_name}/{filename}"
    except Exception as e:
        print(f"Error saving file {filename}: {str(e)}")
        return None
