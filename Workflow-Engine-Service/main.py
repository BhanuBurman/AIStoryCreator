import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

from api.routes import router as workflow_router
from config import LLM_SERVICE_URL

app = FastAPI(
    title="AIStoryCreator - Workflow Engine Service",
    description="Microservice orchestrating 5-beat story blueprints, literary prose generation, photorealistic visuals, and chat co-authorship.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API
app.include_router(workflow_router, prefix="/api/workflow")

@app.get("/")
@app.get("/health")
def health_check():
    llm_status = "unreachable"
    try:
        r = requests.get(f"{LLM_SERVICE_URL}/health", timeout=3)
        if r.status_code == 200:
            llm_status = "connected"
    except Exception:
        llm_status = "disconnected"

    return {
        "service": "Workflow-Engine-Service",
        "status": "healthy",
        "port": 8002,
        "llm_service_url": LLM_SERVICE_URL,
        "llm_service_connection": llm_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
