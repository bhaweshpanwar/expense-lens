import os
from typing import Optional, Dict, Any
from .base_provider import BaseProvider

class FallbackProvider(BaseProvider):
    """
    A simple fallback provider. In a real scenario, this could be another AI API.
    For this implementation, it acts as a basic rule-based extractor or a secondary API wrapper.
    """
    async def extract_expense_info(self, raw_text: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        # This is a simplified fallback. It returns nulls or very basic matches.
        # In production, this would call a different LLM (e.g., GPT-4o-mini or similar).
        return {
            "vendor": None,
            "amount": None,
            "date": None,
            "category": "Other",
            "raw_text": raw_text
        }

    async def explain_unusual_expense(self, data: Dict[str, Any]) -> str:
        diff = data.get('difference', 0)
        avg = data.get('historical_average', 0)
        return f"The expense is {diff} units different from the historical average of {avg}."
