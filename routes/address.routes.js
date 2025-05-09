const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All address routes require authentication
router.use(authMiddleware);

// Get user's addresses
router.get('/', addressController.getUserAddresses);

// Get specific address
router.get('/:id', addressController.getAddressById);

// Create new address
router.post('/', addressController.createAddress);

// Update address
router.put('/:id', addressController.updateAddress);

// Delete address
router.delete('/:id', addressController.deleteAddress);

module.exports = router; 