import pytesseract
import numpy as np
from PIL import Image
import cv2

class OCRService:
    @staticmethod
    def extract_text(processed_image: np.ndarray) -> str:
        """
        Extract text from a preprocessed image using Tesseract.
        """
        # Convert numpy array back to PIL image for pytesseract
        pil_img = Image.fromarray(processed_image)
        text = pytesseract.image_to_string(pil_img)
        return text.strip()
