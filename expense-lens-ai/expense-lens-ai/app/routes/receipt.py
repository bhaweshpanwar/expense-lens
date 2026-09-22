from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.receipt_service import ReceiptService

router = APIRouter()
receipt_service = ReceiptService()

@router.post("/analyze-receipt")
async def analyze_receipt(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Only JPG, JPEG and PNG are supported.")

    image_bytes = await file.read()
    result = await receipt_service.analyze_receipt(image_bytes)

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))

    return result
