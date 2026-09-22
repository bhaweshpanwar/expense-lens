from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class BaseProvider(ABC):
    """Abstract Base Class for AI Providers."""

    @abstractmethod
    async def extract_expense_info(self, raw_text: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Extract structured expense information from raw text and optionally an image.
        """
        pass

    @abstractmethod
    async def explain_unusual_expense(self, data: Dict[str, Any]) -> str:
        """
        Provide a short, factual explanation for an unusual expense.
        """
        pass
