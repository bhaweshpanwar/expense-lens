const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', savingsController.getAll);
router.post('/', savingsController.create);
router.post('/suggestion', savingsController.getSuggestion);

module.exports = router;
