from ..vision.image_preprocessor import ImagePreprocessor
from ..vision.ocr import OCRService
from ..providers.provider_manager import ProviderManager
from typing import Dict, Any

class ReceiptService:
    def __init__(self):
        self.provider_manager = ProviderManager()
        self.preprocessor = ImagePreprocessor()
        self.ocr_service = OCRService()

    async def analyze_receipt(self, image_bytes: bytes) -> Dict[str, Any]:
        try:
            # 1. Preprocess
            processed_img = self.preprocessor.preprocess(image_bytes)

            # 2. OCR
            raw_text = self.ocr_service.extract_text(processed_img)

            if not raw_text:
                return {"success": False, "error": "No text found in image"}

            # 3. AI Extraction
            extracted_data = await self.provider_manager.extract_expense_info(raw_text)

            # Ensure success wrap
            return {
                "success": True,
                "vendor": extracted_data.get("vendor"),
                "amount": extracted_data.get("amount"),
                "date": extracted_data.get("date"),
                "category": extracted_data.get("category"),
                "raw_text": raw_text
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
