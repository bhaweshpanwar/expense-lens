# ExpenseLens AI Service

This is the AI-powered analysis service for ExpenseLens. It handles OCR, receipt information extraction, and unusual expense analysis.

## Installation

1. **Tesseract OCR**:
   This service requires Tesseract OCR installed on your system.
   - **Windows**: Install from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki). Add `C:\Program Files\Tesseract-OCR` to your system PATH.
   - **Linux**: `sudo apt install tesseract-ocr`
   - **Mac**: `brew install tesseract`

2. **Python Setup**:
   ```bash
   cd expense-lens-ai
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY=your_key
   BACKUP_AI_API_KEY=your_key
   PRIMARY_AI_PROVIDER=gemini
   ```

## Running the Service

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### 1. Health Check
- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok"}`

### 2. Analyze Receipt
- **Endpoint**: `POST /api/analyze-receipt`
- **Content-Type**: `multipart/form-data`
- **Payload**: `file` (Image)
- **Response**:
  ```json
  {
    "success": true,
    "vendor": "Sharma Electricals",
    "amount": 8500,
    "date": "2026-09-20",
    "category": "Electricity & Utilities",
    "raw_text": "..."
  }
  ```

### 3. Analyze Unusual Expense
- **Endpoint**: `POST /api/analyze-unusual-expense`
- **Content-Type**: `application/json`
- **Payload**:
  ```json
  {
    "vendor": "Gupta Timber",
    "category": "Raw Materials",
    "amount": 45000,
    "historical_average": 18500
  }
  ```
- **Response**:
  ```json
  {
    "flagged": true,
    "reason": "...",
    "current_amount": 45000,
    "historical_average": 18500,
    "difference": 26500
  }
  ```

## Communication with Node.js
The Node.js backend should use `axios` or `node-fetch` to send requests to this service on port 8000.
