const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { createInventoryController, getInventoryController, getDonorsController, getHospitalController, getOrgnaisationController, getOrgnaisationForHospitalController, getInventoryHospitalController, getRecentInventoryController, listAllOrganisationsController, getStockSummaryController, getDonorStatsController, getHospitalStatsController, listAllHospitalsController, connectHospitalController, getHospitalDonationHistoryController } = require('../controllers/inventoryController');
const router = express.Router();


//ADD INVERNTORY || POST
router.post('/create-inventory', authMiddleware, createInventoryController);

router.get('/get-inventory', authMiddleware, getInventoryController);
router.get('/get-recent-inventory', authMiddleware, getRecentInventoryController);
router.post('/get-inventory-hospital', authMiddleware, getInventoryHospitalController);


router.get('/get-donors', authMiddleware, getDonorsController);
router.get('/get-hospitals', authMiddleware, getHospitalController);
router.get('/get-organisation', authMiddleware, getOrgnaisationController);
router.get('/get-organisation-for-hospital', authMiddleware, getOrgnaisationForHospitalController);
router.get('/all-organisations', authMiddleware, listAllOrganisationsController);
router.get('/stock-summary', authMiddleware, getStockSummaryController);
router.get('/donor-stats', authMiddleware, getDonorStatsController);
router.get('/hospital-stats', authMiddleware, getHospitalStatsController);
router.get('/hospital-donation-history', authMiddleware, getHospitalDonationHistoryController);
router.get('/all-hospitals', authMiddleware, listAllHospitalsController);
router.post('/connect-hospital', authMiddleware, connectHospitalController);

module.exports = router;