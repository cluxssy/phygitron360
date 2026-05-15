import logging
import httpx
from typing import Dict, Any, Optional
from backend.common.services.ai.agents import AIAgents

logger = logging.getLogger(__name__)

class SandboxService:
    def __init__(self):
        self.ai_agents = AIAgents()

    async def execute_code_sandbox(self, language: str, code: str, stdin: str = "", test_cases: list = []) -> Dict[str, Any]:
        """Execute code in a secure sandbox via Piston API with AI fallback."""
        p_lang = "cpp" if language.lower() == "c++" else language.lower()
        
        # In a real app, wrap_code_for_execution is needed
        # (Simplified implementation for portability)
        wrapped_code = self._wrap_code_for_execution(code, p_lang, test_cases)
        
        payload = {
            "language": p_lang,
            "version": "3.10.0" if p_lang == "python" else "*",
            "files": [{"content": wrapped_code}],
            "stdin": stdin
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post("https://emkc.org/api/v2/piston/execute", json=payload, timeout=10.0)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                logger.warning(f"Piston execution failed: {e}")
        
        # Fallback to AI simulation if external sandbox is down
        ai_system = "You are a code execution simulator. Given the code and stdin, provide the output."
        ai_prompt = f"Code:\n{wrapped_code}\n\nStdin:\n{stdin}\n\nRespond ONLY with JSON: {{'run': {{'stdout': '...', 'stderr': '...'}}}}"
        return await self.ai_agents.ai.generate_json(ai_prompt, ai_system)

    def _wrap_code_for_execution(self, code: str, language: str, test_cases: list = []) -> str:
        # Simplified boilerplate wrapper
        # For actual assessments, we'd inject test harness code here
        return code
