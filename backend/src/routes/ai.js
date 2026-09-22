const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

// In-memory storage for handling uploaded images before forwarding to Python AI service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
    }
  },
});

// AI Health check (public / internal)
router.get('/health', aiController.getHealth);

// Authenticated AI routes
router.use(authMiddleware);

// Analyze receipt image via OCR + Gemini
router.post('/analyze-receipt', upload.single('file'), aiController.analyzeReceipt);

// Explain unusual outlier via LLM
router.post('/explain-unusual', aiController.explainUnusual);

// Recommend category budgets via Nemotron AI
router.post('/recommend-budgets', aiController.recommendBudgets);

module.exports = router;
