const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getPayablesSummary,
  getPayables,
  recordPayment
} = require('../controllers/payablesController');

// All routes require authentication
router.use(authMiddleware);

// GET /api/payables/summary - metrics, aging schedule, due date alerts
router.get('/summary', getPayablesSummary);

// GET /api/payables - filtered list of payable invoices
router.get('/', getPayables);

// POST /api/payables/:id/record-payment - record full/partial payment
router.post('/:id/record-payment', recordPayment);

module.exports = router;
