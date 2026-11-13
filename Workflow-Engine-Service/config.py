import os

LLM_SERVICE_URL = os.environ.get("LLM_SERVICE_URL", "http://localhost:8001")
STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)
