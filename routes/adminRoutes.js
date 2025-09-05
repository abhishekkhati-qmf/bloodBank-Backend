const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const {
  getDonorsListController,
  getHospitalListController,
  getOrgListController,
  deleteDonorController,
  blockUnblockUserController,
  getBlockedUsersCount,
  getHospitalListWithStockController,
  getOrgListWithStockController,
} = require("../controllers/adminController");
const adminMiddleware = require("../middleware/adminMiddleware.js");

//router object
const router = express.Router();

//Routes

//GET || DONOR LIST
router.get(
  "/donor-list",
  authMiddleware,
  adminMiddleware,
  getDonorsListController
);
//GET || HOSPITAL LIST
router.get(
  "/hospital-list",
  authMiddleware,
  adminMiddleware,
  getHospitalListController
);
//GET || ORG LIST
router.get("/org-list", authMiddleware, adminMiddleware, getOrgListController);

//GET || HOSPITAL LIST WITH BLOOD STOCK
router.get(
  "/hospital-list-with-stock",
  authMiddleware,
  adminMiddleware,
  getHospitalListWithStockController
);

//GET || ORG LIST WITH BLOOD STOCK
router.get(
  "/org-list-with-stock",
  authMiddleware,
  adminMiddleware,
  getOrgListWithStockController
);
// ==========================

// DELETE DONOR || GET
router.delete(
  "/delete-donor/:id",
  authMiddleware,
  adminMiddleware,
  deleteDonorController
);

// BLOCK/UNBLOCK USER
router.put(
  "/block-unblock/:id",
  authMiddleware,
  adminMiddleware,
  blockUnblockUserController
);

// GET BLOCKED USERS COUNT
router.get(
  "/blocked-count",
  authMiddleware,
  adminMiddleware,
  getBlockedUsersCount
);

//EXPORT
module.exports = router;