import os
from dotenv import load_dotenv
from google import genai

env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_dotenv(dotenv_path=env_path)
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key loaded: {api_key is not None}")
client = genai.Client(api_key=api_key)
try:
    for m in client.models.list():
        print(m.name)
except Exception as e:
    print("Error:", e)
