const donationRequestModel = require("../models/donationRequestModel");
const userModel = require("../models/userModel");
const inventoryModel = require("../models/inventoryModel");
const { sendDonationRequestEmail, sendDonationResponseEmail } = require("../services/emailService");

// Create donation request
const createDonationRequest = async (req, res) => {
  try {
    const user = req.user;
    const { organisationId, bloodGroup } = req.body;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Only donors can create donation requests
    if (userData.role !== 'donor') {
      return res.status(403).json({ 
        success: false, 
        message: "Only donors can create donation requests" 
      });
    }

    // Check if organisation exists
    const organisation = await userModel.findById(organisationId);
    if (!organisation || organisation.role !== 'organisation') {
      return res.status(404).json({ 
        success: false, 
        message: "Organisation not found" 
      });
    }

    // Check if there's already a pending request
    const existingRequest = await donationRequestModel.findOne({
      donor: user.userId,
      organisation: organisationId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: "You already have a pending or approved request with this organisation" 
      });
    }

    const donationRequest = new donationRequestModel({
      donor: user.userId,
      organisation: organisationId,
      bloodGroup: bloodGroup || userData.bloodGroup,
    });

    await donationRequest.save();

    // Send email notification to organisation
    await sendDonationRequestEmail(organisation, userData, donationRequest);

    return res.status(201).json({
      success: true,
      message: "Donation request created successfully",
      donationRequest,
    });
  } catch (error) {
    console.log("Error in creating donation request: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get donor's donation requests
const getDonorDonationRequests = async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (userData.role !== 'donor') {
      return res.status(403).json({ 
        success: false, 
        message: "Only donors can view their donation requests" 
      });
    }

    const donationRequests = await donationRequestModel.find({ donor: user.userId })
      .populate('organisation', 'organisationName email phone address city')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      donationRequests,
    });
  } catch (error) {
    console.log("Error in getting donor donation requests: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get organisation's donation requests
const getOrganisationDonationRequests = async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (userData.role !== 'organisation') {
      return res.status(403).json({ 
        success: false, 
        message: "Only organisations can view donation requests" 
      });
    }

    const donationRequests = await donationRequestModel.find({ organisation: user.userId })
      .populate('donor', 'name email phone bloodGroup city')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      donationRequests,
    });
  } catch (error) {
    console.log("Error in getting organisation donation requests: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update donation request status (organisation only)
const updateDonationRequestStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, responseNotes } = req.body;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (userData.role !== 'organisation') {
      return res.status(403).json({ 
        success: false, 
        message: "Only organisations can update donation request status" 
      });
    }

    if (!['approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status" 
      });
    }

    const donationRequest = await donationRequestModel.findById(id);
    if (!donationRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Donation request not found" 
      });
    }

    if (String(donationRequest.organisation) !== String(user.userId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only update your own donation requests" 
      });
    }

    // Update status and response details
    donationRequest.status = status;
    donationRequest.responseNotes = responseNotes;
    donationRequest.responseDate = new Date();

    if (status === 'completed') {
      donationRequest.completedDate = new Date();
      
      // Create inventory record for the donation
      const donor = await userModel.findById(donationRequest.donor);
      const inventoryRecord = new inventoryModel({
        inventoryType: "in",
        bloodGroup: donationRequest.bloodGroup,
        quantity: 350, // Standard blood donation amount
        organisation: user.userId,
        donar: donationRequest.donor,
        email: donor.email,
        phone: donor.phone,
        status: "approved",
      });
      
      await inventoryRecord.save();
      donationRequest.donationRecord = inventoryRecord._id;
      
    } else if (status === 'cancelled') {
      donationRequest.cancelledDate = new Date();
      donationRequest.cancelledBy = user.userId;
    }

    await donationRequest.save();

    // Send email notification to donor
    const donor = await userModel.findById(donationRequest.donor);
    await sendDonationResponseEmail(donor, userData, donationRequest);

    return res.status(200).json({
      success: true,
      message: `Donation request ${status} successfully`,
      donationRequest,
    });
  } catch (error) {
    console.log("Error in updating donation request status: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Cancel donation request (donor only)
const cancelDonationRequest = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (userData.role !== 'donor') {
      return res.status(403).json({ 
        success: false, 
        message: "Only donors can cancel their donation requests" 
      });
    }

    const donationRequest = await donationRequestModel.findById(id);
    if (!donationRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Donation request not found" 
      });
    }

    if (String(donationRequest.donor) !== String(user.userId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only cancel your own donation requests" 
      });
    }

    if (donationRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: "Can only cancel pending requests" 
      });
    }

    donationRequest.status = 'cancelled';
    donationRequest.cancelledDate = new Date();
    donationRequest.cancelledBy = user.userId;
    donationRequest.cancelledReason = reason || 'Cancelled by donor';

    await donationRequest.save();

    return res.status(200).json({
      success: true,
      message: "Donation request cancelled successfully",
      donationRequest,
    });
  } catch (error) {
    console.log("Error in cancelling donation request: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all organisations with blood inventory for donors
const getAllOrganisationsForDonors = async (req, res) => {
  try {
    const organisations = await userModel.find({ role: 'organisation' })
      .select('organisationName email phone address city website')
      .sort({ organisationName: 1 });

    // Get blood inventory for each organisation
    const organisationsWithInventory = await Promise.all(
      organisations.map(async (org) => {
        const inventory = await inventoryModel.aggregate([
          { $match: { organisation: org._id, inventoryType: 'in' } },
          { $group: { _id: '$bloodGroup', totalQuantity: { $sum: '$quantity' } } }
        ]);

        const bloodInventory = {};
        inventory.forEach(item => {
          bloodInventory[item._id] = item.totalQuantity;
        });

        return {
          ...org.toObject(),
          bloodInventory
        };
      })
    );

    return res.status(200).json({
      success: true,
      organisations: organisationsWithInventory,
    });
  } catch (error) {
    console.log("Error in getting organisations for donors: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get donor's recent organisations (organisations they donated to)
const getDonorRecentOrganisations = async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (userData.role !== 'donor') {
      return res.status(403).json({ 
        success: false, 
        message: "Only donors can view their recent organisations" 
      });
    }

    // Get organisations from completed donation requests
    const recentOrganisations = await donationRequestModel.find({
      donor: user.userId,
      status: 'completed'
    })
      .populate('organisation', 'organisationName email phone address city')
      .sort({ completedDate: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      recentOrganisations,
    });
  } catch (error) {
    console.log("Error in getting donor recent organisations: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

module.exports = {
  createDonationRequest,
  getDonorDonationRequests,
  getOrganisationDonationRequests,
  updateDonationRequestStatus,
  cancelDonationRequest,
  getAllOrganisationsForDonors,
  getDonorRecentOrganisations,
};
