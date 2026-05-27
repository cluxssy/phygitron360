import os
import json
from dotenv import load_dotenv

# Load explicitly from backend/ folder or fallback to root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
load_dotenv(dotenv_path=env_path)

class AIService:
    """
    Base AI Provider designed to be provider-independent.
    Can easily swap between Mock, OpenAI, Gemini, or Claude.
    """
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "mock").lower()
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")

        if self.provider == "gemini" and self.gemini_api_key:
            from google import genai
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)

        if self.provider == "openai" and self.openai_api_key:
            from openai import AsyncOpenAI
            self.openai_client = AsyncOpenAI(api_key=self.openai_api_key)
            self.openai_model = "gpt-4o-mini"

        if self.provider == "groq" and self.groq_api_key:
            from groq import Groq
            self.groq_client = Groq(api_key=self.groq_api_key)
            self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")


    async def generate_json(self, prompt: str, system_prompt: str = "", provider_override: str = None) -> dict:
        """
        Generates a JSON response from the LLM based on a prompt and system message.
        Supports provider override for fallback logic.
        """
        provider = provider_override or self.provider

        if provider == "mock":
            return self._mock_json_response(prompt)
        
        # Groq Logic (Fast & Reliable)
        elif provider == "groq":
            if not getattr(self, "groq_client", None):
                # Fallback to Gemini if Groq not configured
                return await self.generate_json(prompt, system_prompt, provider_override="gemini")
            
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content.strip()
                return json.loads(content)
            except Exception as e:
                print(f"Groq failed: {e}. Falling back to Gemini...")
                return await self.generate_json(prompt, system_prompt, provider_override="gemini")

        # OpenAI Logic
        elif provider == "openai":
            if not getattr(self, "openai_client", None):
                return await self.generate_json(prompt, system_prompt, provider_override="gemini")
                
            try:
                response = await self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=[
                        {"role": "system", "content": system_prompt + "\n\nIMPORTANT: Return ONLY valid JSON and NOTHING ELSE."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                
                clean_text = response.choices[0].message.content
                return json.loads(clean_text)
            except Exception as e:
                print(f"OpenAI failed: {e}. Falling back to Gemini...")
                return await self.generate_json(prompt, system_prompt, provider_override="gemini")
            
        # Gemini Logic
        elif provider == "gemini":
            if not getattr(self, "gemini_client", None):
                # Ultimate fallback to mock
                return self._mock_json_response(prompt)
                
            full_prompt = f"{system_prompt}\n\n{prompt}\n\nIMPORTANT: Return ONLY valid JSON and NOTHING ELSE. Do not use markdown backticks like ```json."
            
            try:
                response = self.gemini_client.models.generate_content(
                    model='gemini-3-flash-preview', # Correct model ID based on API Key scan
                    contents=full_prompt,
                )
                clean_text = response.text.replace('```json', '').replace('```', '').strip()
                return json.loads(clean_text)
            except Exception as e:
                print(f"Gemini failed: {e}")
                return self._mock_json_response(prompt)
        
        return {}
        
        return {}

    def _mock_json_response(self, prompt: str) -> dict:
        """
        A smart mock function that returns structured data based on the prompt 
        so development/testing can continue without hitting API limits or needing keys.
        """
        prompt_lower = prompt.lower()
        
        if "resume" in prompt_lower or "cv" in prompt_lower:
            return {
                "name": "Jane Doe",
                "email": "jane.doe@example.com",
                "phone": "+1 555-0198",
                "location": "San Francisco, CA",
                "experience_years_total": 5.5,
                "current_designation": "Senior React Developer",
                "current_company": "Tech Innovators Inc.",
                "skills": [
                    {"name": "React", "level": "expert", "years_of_use": 4},
                    {"name": "TypeScript", "level": "advanced", "years_of_use": 3},
                    {"name": "FastAPI", "level": "intermediate", "years_of_use": 2}
                ],
                "experience": [
                    {
                        "company": "Tech Innovators Inc.",
                        "designation": "Senior React Developer",
                        "start_date": "2021-01",
                        "end_date": "Present",
                        "is_current": True,
                        "description": "Led frontend architecture using React, Vite, and Tailwind CSS. Integrated with Python/FastAPI backend."
                    },
                    {
                        "company": "Web Solutions Ltd.",
                        "designation": "Frontend Developer",
                        "start_date": "2018-05",
                        "end_date": "2020-12",
                        "is_current": False,
                        "description": "Developed dynamic dashboards and user interfaces using React and Redux."
                    }
                ],
                "education": [
                    {
                        "institution": "State University",
                        "degree": "Bachelors",
                        "field_of_study": "Computer Science",
                        "start_date": "2014-08",
                        "end_date": "2018-05"
                    }
                ]
            }
        
        # Default empty mock
        return {}
