from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.unusual_expense_service import UnusualExpenseService

router = APIRouter()
unusual_service = UnusualExpenseService()

class ExpenseData(BaseModel):
    vendor: str
    category: str
    amount: float
    historical_average: float

@router.post("/analyze-unusual-expense")
async def analyze_unusual_expense(data: ExpenseData):
    try:
        result = await unusual_service.analyze_expense(data.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
