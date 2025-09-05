const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  createRequest,
  listRequestsForHospital,
  listRequestsForOrganisation,
  approveRequest,
  rejectRequest,
  markFulfilledByHospital,
} = require('../controllers/requestController');

const router = express.Router();

router.post('/', auth, createRequest); // hospital create
router.get('/hospital', auth, listRequestsForHospital);
router.get('/organisation', auth, listRequestsForOrganisation);
router.post('/:id/approve', auth, approveRequest);
router.post('/:id/reject', auth, rejectRequest);
router.post('/:id/fulfilled', auth, markFulfilledByHospital);

module.exports = router;


