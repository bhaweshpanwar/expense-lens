const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', vendorController.getAll);
router.post('/', vendorController.create);
router.put('/:id', vendorController.update);
router.delete('/:id', vendorController.remove);

module.exports = router;
