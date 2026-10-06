from typing import Dict, Any, Optional
from app.prompts.templates import PROMPT_TEMPLATES

class PromptManager:
    """Manages industry-specific prompts, variable replacements, and system prompt formatting."""

    @staticmethod
    def get_template(industry: str = "real_estate") -> Dict[str, Any]:
        return PROMPT_TEMPLATES.get(industry, PROMPT_TEMPLATES["real_estate"])

    @staticmethod
    def build_system_prompt(
        industry: str = "real_estate",
        custom_system_prompt: Optional[str] = None,
        business_context: Optional[str] = None
    ) -> str:
        base_prompt = custom_system_prompt or PromptManager.get_template(industry)["system_prompt"]
        
        if business_context:
            base_prompt += f"\n\n--- BUSINESS KNOWLEDGE CONTEXT ---\n{business_context}\n--- END CONTEXT ---"
            
        return base_prompt

    @staticmethod
    def get_greeting(industry: str = "real_estate", custom_greeting: Optional[str] = None) -> str:
        if custom_greeting:
            return custom_greeting
        return PromptManager.get_template(industry)["greeting"]
