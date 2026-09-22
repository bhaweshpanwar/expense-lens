const aiService = require('../services/aiService');

/**
 * POST /api/ai/analyze-receipt
 * Supports multipart file upload (req.file) or base64 data string (req.body.image)
 */
const analyzeReceipt = async (req, res, next) => {
  try {
    let fileBuffer = null;
    let filename = 'receipt.jpg';
    let mimetype = 'image/jpeg';

    if (req.file) {
      fileBuffer = req.file.buffer;
      filename = req.file.originalname || filename;
      mimetype = req.file.mimetype || mimetype;
    } else if (req.body && req.body.image) {
      const base64Str = req.body.image;
      const matches = base64Str.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        mimetype = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(base64Str, 'base64');
      }
    }

    if (!fileBuffer) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a receipt image via multipart file upload or base64 JSON payload.',
      });
    }

    const result = await aiService.analyzeReceipt(fileBuffer, filename, mimetype);

    res.json({
      success: true,
      data: result.data,
      fallback: Boolean(result.fallback),
      error: result.error || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/explain-unusual
 * Explains an unusual transaction outlier via LLM
 */
const explainUnusual = async (req, res, next) => {
  try {
    const { vendor, category, amount, historical_average } = req.body;
    const result = await aiService.explainUnusualExpense({
      vendor,
      category,
      amount,
      historical_average,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/health
 * Checks connection to the Python AI service
 */
const getHealth = async (req, res, next) => {
  try {
    const health = await aiService.getHealth();
    res.json({
      success: true,
      data: health,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/recommend-budgets
 * Uses Nemotron to suggest optimal category budgets
 */
const recommendBudgets = async (req, res, next) => {
  try {
    const { categoryBreakdown, monthlyBudget } = req.body;
    const result = await aiService.recommendBudgetLimits({
      categoryBreakdown: categoryBreakdown || [],
      monthlyBudget: monthlyBudget || 100000,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  analyzeReceipt,
  explainUnusual,
  recommendBudgets,
  getHealth,
};
