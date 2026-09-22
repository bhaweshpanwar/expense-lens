import cv2
import numpy as np
from PIL import Image
import io

class ImagePreprocessor:
    @staticmethod
    def preprocess(image_bytes: bytes) -> np.ndarray:
        """
        Preprocess image for better OCR results.
        """
        # Load image from bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Could not decode image")

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Noise removal
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        return thresh
