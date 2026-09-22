const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);
router.get('/by-category', dashboardController.getByCategory);
router.get('/by-vendor', dashboardController.getByVendor);
router.get('/trend', dashboardController.getTrend);
router.get('/unusual-transactions', dashboardController.getUnusualTransactions);

module.exports = router;
