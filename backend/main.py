import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Set up central deploy module router
from backend.modules.deploy.api.auth import router as auth_router
from backend.modules.deploy.api.dashboard import router as dashboard_router
from backend.modules.deploy.api.employees import router as employees_router
from backend.modules.deploy.api.assets import router as assets_router
from backend.modules.deploy.api.attendance import router as attendance_router
from backend.modules.deploy.api.assessments import router as assessments_router
from backend.modules.deploy.api.training import router as training_router
from backend.modules.deploy.api.onboarding import router as onboarding_router
from backend.modules.deploy.api.notifications import router as notifications_router
from backend.modules.deploy.api.password import router as password_router
from backend.modules.deploy.api.admin import router as admin_router
from backend.api.billing import router as billing_router

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

# Include Modules
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(employees_router)
app.include_router(assets_router)
app.include_router(attendance_router)
app.include_router(assessments_router)
app.include_router(training_router)
app.include_router(onboarding_router)
app.include_router(notifications_router)
app.include_router(password_router)
app.include_router(admin_router)
app.include_router(billing_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
