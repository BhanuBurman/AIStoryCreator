import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import router as api_router, load_config

app = FastAPI(
    title="AIStoryCreator - LLM & Image Service",
    description="Microservice providing switchable LLM reasoning, story writing prompts, photorealistic image synthesis and generation.",
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

# Static files for generated images
images_dir = os.path.join(os.path.dirname(__file__), "generated_images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/generated_images", StaticFiles(directory=images_dir), name="generated_images")

# API Routes
app.include_router(api_router, prefix="/api")

@app.get("/")
@app.get("/health")
def health_check():
    cfg = load_config()
    return {
        "service": "LLM-Service",
        "status": "healthy",
        "port": 8001,
        "text_provider": cfg.get("text_model", {}).get("provider"),
        "text_model": cfg.get("text_model", {}).get("model_name"),
        "image_provider": cfg.get("image_model", {}).get("provider"),
        "image_model": cfg.get("image_model", {}).get("model_name")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
