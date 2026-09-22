import os
from typing import Optional, Dict, Any
from .gemini_provider import GeminiProvider
from .fallback_provider import FallbackProvider
from .base_provider import BaseProvider

class ProviderManager:
    def __init__(self):
        self.primary_provider_name = os.getenv("PRIMARY_AI_PROVIDER", "gemini").lower()
        self._providers = {
            "gemini": GeminiProvider,
            "fallback": FallbackProvider
        }
        self.current_provider: Optional[BaseProvider] = None
        self._initialize_provider()

    def _initialize_provider(self):
        try:
            provider_class = self._providers.get(self.primary_provider_name, FallbackProvider)
            self.current_provider = provider_class()
        except Exception:
            self.current_provider = FallbackProvider()

    async def extract_expense_info(self, raw_text: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        try:
            return await self.current_provider.extract_expense_info(raw_text, image_bytes)
        except Exception as e:
            # Fallback mechanism
            if not isinstance(self.current_provider, FallbackProvider):
                fallback = FallbackProvider()
                return await fallback.extract_expense_info(raw_text, image_bytes)
            raise e

    async def explain_unusual_expense(self, data: Dict[str, Any]) -> str:
        try:
            return await self.current_provider.explain_unusual_expense(data)
        except Exception as e:
            if not isinstance(self.current_provider, FallbackProvider):
                fallback = FallbackProvider()
                return await fallback.explain_unusual_expense(data)
            raise e
