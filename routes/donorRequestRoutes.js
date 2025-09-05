const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createDonorRequest,
  getDonorRequests,
  getOrganisationDonorRequests,
  approveDonorRequest,
  rejectDonorRequest,
  markDonationCompleted,
  cancelDonorRequest,
  getDonorRequestHistory
} = require('../controllers/donorRequestController');

const router = express.Router();

// Donor routes
router.post('/create', authMiddleware, createDonorRequest);
router.get('/donor', authMiddleware, getDonorRequests);

// Organisation routes
router.get('/organisation', authMiddleware, getOrganisationDonorRequests);
router.put('/approve/:id', authMiddleware, approveDonorRequest);
router.put('/reject/:id', authMiddleware, rejectDonorRequest);
router.put('/complete/:id', authMiddleware, markDonationCompleted);
router.delete('/cancel/:id', authMiddleware, cancelDonorRequest);

// Admin routes
router.get('/history', authMiddleware, getDonorRequestHistory);

module.exports = router;
