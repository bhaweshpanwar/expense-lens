const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const taxController = require('../controllers/taxController');

router.get('/gst-summary', authMiddleware, taxController.getGstSummary);
router.get('/export-gstr2b', authMiddleware, taxController.exportGstr2bCsv);

module.exports = router;
