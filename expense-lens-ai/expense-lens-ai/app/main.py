from fastapi import FastAPI
from .routes import receipt, unusual_expense

app = FastAPI(title="ExpenseLens AI Service")

# Include routes
app.include_router(receipt.router, prefix="/api")
app.include_router(unusual_expense.router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
