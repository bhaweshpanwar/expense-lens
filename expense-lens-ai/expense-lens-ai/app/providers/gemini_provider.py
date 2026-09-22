import os
import google.generativeai as genai
from typing import Optional, Dict, Any
from .base_provider import BaseProvider
from dotenv import load_dotenv

load_dotenv()

class GeminiProvider(BaseProvider):
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def extract_expense_info(self, raw_text: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        prompt = f"""
        Extract the following expense details from the provided receipt text.
        Return ONLY a valid JSON object.

        Required Fields:
        - vendor: Name of the store or service provider.
        - amount: Total amount as a number.
        - date: Date in YYYY-MM-DD format.
        - category: Suggest one from this list: [Raw Materials, Electricity & Utilities, Rent, Transportation, Packaging, Maintenance, Office Supplies, Marketing, Labour, Other].

        If a field is not found, use null.

        Receipt Text:
        {raw_text}
        """

        try:
            # Gemini can take image bytes directly if we wrap them in a part,
            # but for simplicity and reliability we use the text extracted by OCR.
            response = self.model.generate_content(prompt)
            # Clean response text to ensure it's valid JSON (remove markdown backticks)
            text = response.text.strip().replace('```json', '').replace('```', '').strip()
            import json
            return json.loads(text)
        except Exception as e:
            raise RuntimeError(f"Gemini extraction failed: {str(e)}")

    async def explain_unusual_expense(self, data: Dict[str, Any]) -> str:
        prompt = f"""
        Provide a short, factual explanation for this unusual expense.
        Use ONLY the provided data. Do not invent reasons, fraud, or business behavior.

        Current Amount: {data.get('amount')}
        Historical Average: {data.get('historical_average')}
        Difference: {data.get('difference')}

        Explanation:
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            raise RuntimeError(f"Gemini explanation failed: {str(e)}")
