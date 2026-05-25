import os
import shutil
import logging
from fastapi import UploadFile
from backend.core.database import DATA_DIR

logger = logging.getLogger(__name__)

BASE_UPLOADS_DIR = os.path.join(DATA_DIR, 'uploads')

# S3 config — read once at import time
_S3_BUCKET   = os.environ.get('AWS_S3_BUCKET', '')
_S3_REGION   = os.environ.get('AWS_S3_REGION', 'us-east-1')
_S3_ENDPOINT = os.environ.get('AWS_S3_ENDPOINT_URL', '')   # for LocalStack: http://localhost:4566
_USE_S3      = bool(_S3_BUCKET)

# Lazy-load boto3 only when actually needed
_s3_client = None

def _get_s3():
    global _s3_client
    if _s3_client is None:
        import boto3
        kwargs = {'region_name': _S3_REGION}
        if _S3_ENDPOINT:                     # LocalStack / custom endpoint
            kwargs['endpoint_url'] = _S3_ENDPOINT
        _s3_client = boto3.client('s3', **kwargs)
    return _s3_client


def save_uploaded_file(uploaded_file: UploadFile, folder_name: str, identifier: str, suffix: str) -> str:
    """
    Save an uploaded file.
    - If AWS_S3_BUCKET is set  → upload to S3, return public HTTPS URL.
    - Otherwise               → save to local disk, return relative path
                                 (e.g. 'uploads/pfps/EMP001_pfp.jpg') 
                                 served by FastAPI StaticFiles at /uploads/...
    """
    if not uploaded_file:
        return None

    # Build filename
    ext     = os.path.splitext(uploaded_file.filename or '')[1] or '.bin'
    safe_id = identifier.replace('/', '_').replace('\\', '_').strip()
    filename = f"{safe_id}_{suffix}{ext}"

    # ── S3 path ──────────────────────────────────────────────────────────────
    if _USE_S3:
        s3_key = f"uploads/{folder_name}/{filename}"
        try:
            uploaded_file.file.seek(0)          # rewind in case already read
            _get_s3().upload_fileobj(
                uploaded_file.file,
                _S3_BUCKET,
                s3_key,
                ExtraArgs={'ContentType': uploaded_file.content_type or 'application/octet-stream'},
            )
            if _S3_ENDPOINT:                    # LocalStack — build URL manually
                url = f"{_S3_ENDPOINT}/{_S3_BUCKET}/{s3_key}"
            else:
                url = f"https://{_S3_BUCKET}.s3.{_S3_REGION}.amazonaws.com/{s3_key}"
            logger.info(f"[S3] Uploaded {s3_key} → {url}")
            return url
        except Exception as e:
            logger.error(f"[S3] Upload failed for {s3_key}: {e} — falling back to local disk")
            # Fall through to local save below

    # ── Local disk fallback ───────────────────────────────────────────────────
    try:
        folder_path = os.path.join(BASE_UPLOADS_DIR, folder_name)
        os.makedirs(folder_path, exist_ok=True)
        filepath = os.path.join(folder_path, filename)
        uploaded_file.file.seek(0)              # rewind after possible S3 attempt
        with open(filepath, "wb") as buf:
            shutil.copyfileobj(uploaded_file.file, buf)
        logger.info(f"[LocalDisk] Saved {filepath}")
        return f"uploads/{folder_name}/{filename}"
    except Exception as e:
        logger.error(f"[LocalDisk] Save failed for {filename}: {e}")
        return None
