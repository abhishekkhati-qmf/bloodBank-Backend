const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  createCamp,
  getOrganisationCamps,
  getPendingCamps,
  updateCampStatus,
  getPublishedCamps,
  updateCamp,
  deleteCamp,
  getCampStats,
  getAllCampsForAdmin,
} = require('../controllers/campController');

const router = express.Router();

// Public routes (no auth required)
router.get('/published', getPublishedCamps);

// Organisation routes
router.post('/create', authMiddleware, createCamp);
router.get('/organisation', authMiddleware, getOrganisationCamps);
router.put('/:id', authMiddleware, updateCamp);
router.delete('/:id', authMiddleware, deleteCamp);

// Admin routes
router.get('/pending', authMiddleware, adminMiddleware, getPendingCamps);
router.put('/:id/status', authMiddleware, adminMiddleware, updateCampStatus);
router.get('/stats', authMiddleware, adminMiddleware, getCampStats);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllCampsForAdmin);

module.exports = router;
