const campModel = require("../models/campModel");
const userModel = require("../models/userModel");
const { sendCampNotificationEmail } = require("../services/emailService");

// Create a new blood donation camp
const createCamp = async (req, res) => {
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
    
    // Only organisations can create camps
    if (userData.role !== 'organisation') {
      return res.status(403).json({ 
        success: false, 
        message: "Only organisations can create blood donation camps" 
      });
    }

    const campData = {
      ...req.body,
      organisation: user.userId,
    };

    const camp = new campModel(campData);
    await camp.save();

    return res.status(201).json({
      success: true,
      message: "Blood donation camp created successfully",
      camp,
    });
  } catch (error) {
    console.log("Error in creating camp: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all camps for an organisation
const getOrganisationCamps = async (req, res) => {
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
        message: "Only organisations can view their camps" 
      });
    }

    const camps = await campModel.find({ organisation: user.userId })
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      camps,
    });
  } catch (error) {
    console.log("Error in getting organisation camps: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all pending camps for admin approval
const getPendingCamps = async (req, res) => {
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
    
    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can view pending camps" 
      });
    }

    const camps = await campModel.find({ status: 'pending' })
      .populate('organisation', 'organisationName email phone')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      camps,
    });
  } catch (error) {
    console.log("Error in getting pending camps: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Admin approve/reject camp
const updateCampStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    // Fetch user data to check role
    const userData = await userModel.findById(user.userId);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can update camp status" 
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status. Must be 'approved' or 'rejected'" 
      });
    }

    const camp = await campModel.findById(id);
    if (!camp) {
      return res.status(404).json({ 
        success: false, 
        message: "Camp not found" 
      });
    }

    camp.status = status;
    camp.adminNotes = adminNotes;
    
    if (status === 'approved') {
      camp.isPublished = true;
      camp.publishedAt = new Date();
      camp.publishedBy = user.userId;
      
      // Send notifications to eligible donors
      await sendCampNotifications(camp);
    }

    await camp.save();

    return res.status(200).json({
      success: true,
      message: `Camp ${status} successfully`,
      camp,
    });
  } catch (error) {
    console.log("Error in updating camp status: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get published camps for donors (public)
const getPublishedCamps = async (req, res) => {
  try {
    const { city, bloodGroup } = req.query;
    
    let query = { 
      status: 'approved', 
      isPublished: true,
      date: { $gte: new Date() }, // Only future camps
      // Exclude completed camps
      _id: { $nin: await campModel.distinct('_id', { status: 'completed' }) }
    };

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (bloodGroup) {
      query.bloodGroups = bloodGroup;
    }

    const camps = await campModel.find(query)
      .populate('organisation', 'organisationName email phone website')
      .sort({ date: 1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      camps,
    });
  } catch (error) {
    console.log("Error in getting published camps: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update camp details (organisation only)
const updateCamp = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
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
        message: "Only organisations can update their camps" 
      });
    }

    const camp = await campModel.findOne({ 
      _id: id, 
      organisation: user.userId 
    });

    if (!camp) {
      return res.status(404).json({ 
        success: false, 
        message: "Camp not found or access denied" 
      });
    }

    // Allow updates for pending camps and status changes for approved camps
    if (camp.status !== 'pending' && camp.status !== 'approved') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot update camp in current status" 
      });
    }

    const updatedCamp = await campModel.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Camp updated successfully",
      camp: updatedCamp,
    });
  } catch (error) {
    console.log("Error in updating camp: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Delete camp (organisation only)
const deleteCamp = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
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
        message: "Only organisations can delete their camps" 
      });
    }

    const camp = await campModel.findOne({ 
      _id: id, 
      organisation: user.userId 
    });

    if (!camp) {
      return res.status(404).json({ 
        success: false, 
        message: "Camp not found or access denied" 
      });
    }

    // Only allow deletion if camp is not yet approved
    if (camp.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete camp after approval" 
      });
    }

    await campModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Camp deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleting camp: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all camps for admin (including history)
const getAllCampsForAdmin = async (req, res) => {
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
    
    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can view all camps" 
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const camps = await campModel.find(query)
      .populate('organisation', 'organisationName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCamps = await campModel.countDocuments(query);
    const totalPages = Math.ceil(totalCamps / limit);

    return res.status(200).json({
      success: true,
      camps,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCamps,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.log("Error in getting all camps for admin: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get camp statistics for admin
const getCampStats = async (req, res) => {
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
    
    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can view camp statistics" 
      });
    }

    const stats = await campModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCamps = await campModel.countDocuments();
    const upcomingCamps = await campModel.countDocuments({
      status: 'approved',
      isPublished: true,
      date: { $gte: new Date() }
    });

    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });

    return res.status(200).json({
      success: true,
      stats: {
        total: totalCamps,
        pending: statsMap.pending || 0,
        approved: statsMap.approved || 0,
        rejected: statsMap.rejected || 0,
        completed: statsMap.completed || 0,
        cancelled: statsMap.cancelled || 0,
        upcoming: upcomingCamps,
      }
    });
  } catch (error) {
    console.log("Error in getting camp stats: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Send camp notifications to eligible donors
const sendCampNotifications = async (camp) => {
  try {
    // Find eligible donors (same blood groups, in same city or nearby)
    const eligibleDonors = await userModel.find({
      role: 'donor',
      bloodGroup: { $in: camp.bloodGroups },
      city: { $regex: camp.city, $options: 'i' },
      emailVerified: true, // Only send to verified users
    });

    // Send emails to eligible donors
    for (const donor of eligibleDonors) {
      try {
        await sendCampNotificationEmail(donor, camp);
      } catch (error) {
        console.log(`Error sending camp notification to ${donor.email}:`, error);
      }
    }

    console.log(`Camp notifications sent to ${eligibleDonors.length} eligible donors`);
  } catch (error) {
    console.log("Error in sending camp notifications: ", error);
  }
};

module.exports = {
  createCamp,
  getOrganisationCamps,
  getPendingCamps,
  updateCampStatus,
  getPublishedCamps,
  updateCamp,
  deleteCamp,
  getCampStats,
  getAllCampsForAdmin,
};
