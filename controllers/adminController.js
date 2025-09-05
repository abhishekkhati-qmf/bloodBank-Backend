const userModel = require("../models/userModel");
const inventoryModel = require("../models/inventoryModel");
const mongoose = require("mongoose");

//GET DONAR LIST
const getDonorsListController = async (req, res) => {
  try {
    const donorData = await userModel
      .find({ role: "donor" })
      .sort({ createdAt: -1 });

    return res.status(200).send({
      success: true,
      Toatlcount: donorData.length,
      message: "Donor List Fetched Successfully",
      donorData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Donor List API",
      error,
    });
  }
};
//GET HOSPITAL LIST
const getHospitalListController = async (req, res) => {
  try {
    const hospitalData = await userModel
      .find({ role: "hospital" })
      .sort({ createdAt: -1 });

    return res.status(200).send({
      success: true,
      Toatlcount: hospitalData.length,
      message: "HOSPITAL List Fetched Successfully",
      hospitalData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Hospital List API",
      error,
    });
  }
};
//GET ORG LIST
const getOrgListController = async (req, res) => {
  try {
    const orgData = await userModel
      .find({ role: "organisation" })
      .sort({ createdAt: -1 });

    return res.status(200).send({
      success: true,
      Toatlcount: orgData.length,
      message: "ORG List Fetched Successfully",
      orgData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In ORG List API",
      error,
    });
  }
};
// =======================================

//DELETE DONOR
const deleteDonorController = async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    return res.status(200).send({
      success: true,
      message: " Record Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error while deleting ",
      error,
    });
  }
};

// Block/Unblock user
const blockUnblockUserController = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'block' or 'unblock'
    
    console.log('Block/Unblock request:', { id, action, adminId: req.user.userId });
    
    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).send({
        success: false,
        message: "Invalid action. Must be 'block' or 'unblock'",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      console.log('User not found:', id);
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }
    
    console.log('User found:', { id: user._id, role: user.role, email: user.email, currentStatus: user.status });

    // Ensure status field exists
    if (!user.status) {
      user.status = 'active';
    }

    let updateData = {};
    if (action === 'block') {
      updateData = {
        status: 'blocked',
        blockedAt: new Date(),
        blockedBy: req.user.userId
      };
    } else {
      updateData = {
        status: 'active',
        blockedAt: null,
        blockedBy: null
      };
    }

    console.log('Updating user with:', updateData);
    
    await userModel.updateOne({ _id: id }, updateData);
    
    console.log('User updated successfully');

    // Get the updated user data
    const updatedUser = await userModel.findById(id);

    return res.status(200).send({
      success: true,
      message: `User ${action}ed successfully`,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name || updatedUser.organisationName || updatedUser.hospitalName,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        blockedAt: updatedUser.blockedAt,
      },
    });
  } catch (error) {
    console.log('Block/Unblock error:', error);
    return res.status(500).send({
      success: false,
      message: "Error in blocking/unblocking user",
      error: error.message,
    });
  }
};

// Get blocked users count
const getBlockedUsersCount = async (req, res) => {
  try {
    const blockedCount = await userModel.countDocuments({ status: 'blocked' });
    
    return res.status(200).send({
      success: true,
      blockedCount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in getting blocked users count",
      error,
    });
  }
};

// Helper function to calculate blood stock for a user
const calculateBloodStock = async (userId, userRole) => {
  const bloodGroups = ["O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"];
  const stock = {};
  
  for (const bloodGroup of bloodGroups) {
    // Calculate total IN (donations received)
    const totalIn = await inventoryModel.aggregate([
      { 
        $match: { 
          [userRole === 'hospital' ? 'hospital' : 'organisation']: new mongoose.Types.ObjectId(userId),
          bloodGroup,
          inventoryType: 'in'
        } 
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    // Calculate total OUT (blood given out)
    const totalOut = await inventoryModel.aggregate([
      { 
        $match: { 
          [userRole === 'hospital' ? 'hospital' : 'organisation']: new mongoose.Types.ObjectId(userId),
          bloodGroup,
          inventoryType: 'out'
        } 
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    const inStock = totalIn[0]?.total || 0;
    const outStock = totalOut[0]?.total || 0;
    stock[bloodGroup] = inStock - outStock;
  }
  
  return stock;
};

// Get hospital list with blood stock
const getHospitalListWithStockController = async (req, res) => {
  try {
    const hospitalData = await userModel
      .find({ role: "hospital" })
      .sort({ createdAt: -1 });

    // Get blood stock for each hospital
    const hospitalsWithStock = await Promise.all(
      hospitalData.map(async (hospital) => {
        const bloodStock = await calculateBloodStock(hospital._id, 'hospital');
        return {
          ...hospital.toObject(),
          bloodStock
        };
      })
    );

    return res.status(200).send({
      success: true,
      Toatlcount: hospitalsWithStock.length,
      message: "Hospital List with Blood Stock Fetched Successfully",
      hospitalData: hospitalsWithStock,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Hospital List with Stock API",
      error,
    });
  }
};

// Get organization list with blood stock
const getOrgListWithStockController = async (req, res) => {
  try {
    const orgData = await userModel
      .find({ role: "organisation" })
      .sort({ createdAt: -1 });

    // Get blood stock for each organization
    const orgsWithStock = await Promise.all(
      orgData.map(async (org) => {
        const bloodStock = await calculateBloodStock(org._id, 'organisation');
        return {
          ...org.toObject(),
          bloodStock
        };
      })
    );

    return res.status(200).send({
      success: true,
      Toatlcount: orgsWithStock.length,
      message: "Organization List with Blood Stock Fetched Successfully",
      orgData: orgsWithStock,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Organization List with Stock API",
      error,
    });
  }
};

//EXPORT
module.exports = {
  getDonorsListController,
  getHospitalListController,
  getOrgListController,
  deleteDonorController,
  blockUnblockUserController,
  getBlockedUsersCount,
  getHospitalListWithStockController,
  getOrgListWithStockController,
};