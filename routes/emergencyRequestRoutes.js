const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  createEmergencyRequest,
  getAllEmergencyRequests,
  getOrganisationEmergencyRequests,
  updateEmergencyRequestStatus,
  getEmergencyRequestStats,
  getDonorEmergencyRequests,
  markEmergencyRequestFulfilled,
  deleteEmergencyRequest,
} = require('../controllers/emergencyRequestController');

const router = express.Router();

// Organisation routes
router.post('/create', authMiddleware, createEmergencyRequest);
router.get('/organisation', authMiddleware, getOrganisationEmergencyRequests);
router.put('/:id/fulfill', authMiddleware, markEmergencyRequestFulfilled);
router.delete('/:id', authMiddleware, deleteEmergencyRequest);

// Donor routes
router.get('/donor', authMiddleware, getDonorEmergencyRequests);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, getAllEmergencyRequests);
router.put('/:id/status', authMiddleware, adminMiddleware, updateEmergencyRequestStatus);
router.get('/stats', authMiddleware, adminMiddleware, getEmergencyRequestStats);

module.exports = router;
