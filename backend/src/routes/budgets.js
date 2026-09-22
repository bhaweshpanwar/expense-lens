const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', budgetController.getAll);
router.post('/', budgetController.createOrUpdate);
router.get('/status', budgetController.getStatus);

module.exports = router;
