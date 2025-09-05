const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createDonationRequest,
  getDonorDonationRequests,
  getOrganisationDonationRequests,
  updateDonationRequestStatus,
  cancelDonationRequest,
  getAllOrganisationsForDonors,
  getDonorRecentOrganisations,
} = require('../controllers/donationRequestController');

const router = express.Router();

// Donor routes
router.post('/create', authMiddleware, createDonationRequest);
router.get('/donor', authMiddleware, getDonorDonationRequests);
router.get('/organisations', authMiddleware, getAllOrganisationsForDonors);
router.get('/recent-organisations', authMiddleware, getDonorRecentOrganisations);
router.put('/:id/cancel', authMiddleware, cancelDonationRequest);

// Organisation routes
router.get('/organisation', authMiddleware, getOrganisationDonationRequests);
router.put('/:id/status', authMiddleware, updateDonationRequestStatus);

module.exports = router;
