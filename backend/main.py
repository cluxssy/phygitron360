import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Set up central deploy module router
from backend.modules.deploy.api.auth import router as auth_router, require_module
from backend.modules.deploy.api.dashboard import router as dashboard_router
from backend.modules.deploy.api.employees import router as employees_router
from backend.modules.deploy.api.assets import router as assets_router
from backend.modules.deploy.api.attendance import router as attendance_router
from backend.modules.deploy.api.assessments import router as assessments_router
from backend.modules.deploy.api.training import router as training_router
from backend.modules.deploy.api.onboarding import router as onboarding_router
from backend.modules.deploy.api.notifications import router as notifications_router
from backend.modules.deploy.api.password import router as password_router
from backend.modules.admin.api.admin import router as admin_router
from backend.modules.admin.api.org import router as org_router
from backend.api.billing import router as billing_router
from fastapi import Depends

# Set up Source & Verify modules
from backend.modules.source.api.candidates import router as candidates_router
from backend.modules.source.api.jobs import router as jobs_router

from backend.modules.verify.api.builder import router as verify_builder_router
from backend.modules.verify.api.assignments import router as verify_assignments_router
from backend.modules.verify.api.submissions import router as verify_submissions_router
from backend.modules.verify.api.sandbox import router as verify_sandbox_router

app = FastAPI(
    title="PHYGITRON 360",
    description="Multi-tenant Modular Talent Intelligence Platform API",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite Dev Server
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global API Response
@app.get("/api/health")
def health_check():
    return JSONResponse(content={"status": "online", "message": "PHYGITRON 360 Platform is operational"})

# Static Files
from backend.core.database import DATA_DIR
uploads_dir = os.path.join(DATA_DIR, 'uploads')
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include Modules
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(employees_router, dependencies=[Depends(require_module("deploy"))])
app.include_router(assets_router, dependencies=[Depends(require_module("deploy"))])
app.include_router(attendance_router, dependencies=[Depends(require_module("deploy"))])
app.include_router(assessments_router, dependencies=[Depends(require_module("deploy"))])
app.include_router(training_router, dependencies=[Depends(require_module("deploy"))])
app.include_router(onboarding_router)
app.include_router(notifications_router, dependencies=[Depends(require_module("deploy"))])
app.include_router(password_router)
app.include_router(admin_router)
app.include_router(org_router)
app.include_router(billing_router)
app.include_router(candidates_router, dependencies=[Depends(require_module("source"))])
app.include_router(jobs_router, dependencies=[Depends(require_module("source"))])

app.include_router(verify_builder_router, dependencies=[Depends(require_module("verify"))])
app.include_router(verify_assignments_router, dependencies=[Depends(require_module("verify"))])
app.include_router(verify_submissions_router, dependencies=[Depends(require_module("verify"))])
app.include_router(verify_sandbox_router, dependencies=[Depends(require_module("verify"))])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
