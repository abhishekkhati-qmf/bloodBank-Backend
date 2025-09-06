const emergencyRequestModel = require("../models/emergencyRequestModel");
const userModel = require("../models/userModel");
const { sendEmergencyRequestEmail } = require("../services/emailService");

// Create emergency request
const createEmergencyRequest = async (req, res) => {
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
    
    // Only organisations can create emergency requests
    if (userData.role !== 'organisation') {
      return res.status(403).json({ 
        success: false, 
        message: "Only organisations can create emergency requests" 
      });
    }

    const emergencyData = {
      ...req.body,
      organisation: user.userId,
    };

    const emergencyRequest = new emergencyRequestModel(emergencyData);
    await emergencyRequest.save();

    // Auto-broadcast to eligible donors
    await broadcastToEligibleDonors(emergencyRequest);

    return res.status(201).json({
      success: true,
      message: "Emergency request created and broadcasted successfully",
      emergencyRequest,
    });
  } catch (error) {
    console.log("Error in creating emergency request: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Broadcast to eligible donors
const broadcastToEligibleDonors = async (emergencyRequest) => {
  try {
    // Find eligible donors based on blood group compatibility and location
    const eligibleDonors = await userModel.find({
      role: 'donor',
      emailVerified: true, // Only verified donors
      $or: [
        // Exact blood group match
        { bloodGroup: emergencyRequest.bloodGroup },
        // Universal donors (O-) can donate to anyone
        { bloodGroup: 'O-' }
      ],
      // Location-based filtering (same city or nearby)
      $or: [
        { city: { $regex: emergencyRequest.city, $options: 'i' } },
        { address: { $regex: emergencyRequest.city, $options: 'i' } }
      ]
    });

    // Update emergency request with eligible donors
    emergencyRequest.eligibleDonors = eligibleDonors.map(donor => ({
      donor: donor._id,
      notified: false,
      response: 'pending',
      bloodGroup: donor.bloodGroup,
      isUniversal: donor.bloodGroup === 'O-'
    }));

    await emergencyRequest.save();

    // Send emails to eligible donors
    for (const donorInfo of emergencyRequest.eligibleDonors) {
      const donor = await userModel.findById(donorInfo.donor);
      if (donor && donor.email) {
        await sendEmergencyRequestEmail(donor, emergencyRequest);
        
        // Mark as notified
        donorInfo.notified = true;
        donorInfo.notifiedAt = new Date();
      }
    }

    // Update broadcast status
    emergencyRequest.broadcastSent = true;
    emergencyRequest.broadcastSentAt = new Date();
    emergencyRequest.notifiedCount = eligibleDonors.length;
    await emergencyRequest.save();

    console.log(`Emergency request broadcasted to ${eligibleDonors.length} eligible donors`);

  } catch (error) {
    console.log("Error in broadcasting to donors: ", error);
  }
};

// Send emergency notification email
const sendEmergencyNotificationEmail = async (donor, emergencyRequest) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: donor.email,
      subject: `🚨 URGENT: Blood Donation Needed - ${emergencyRequest.bloodGroup} - LifeLink`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #d32f2f; text-align: center;">🚨 URGENT BLOOD DONATION REQUEST</h2>
          
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #e65100;">Emergency Details:</h3>
            <p><strong>Blood Group Needed:</strong> <span style="color: #d32f2f; font-weight: bold;">${emergencyRequest.bloodGroup}</span></p>
            <p><strong>Quantity Required:</strong> ${emergencyRequest.quantity} ml</p>
            <p><strong>Urgency Level:</strong> ${emergencyRequest.urgency.toUpperCase()}</p>
            <p><strong>Reason:</strong> ${emergencyRequest.reason}</p>
            <p><strong>Location:</strong> ${emergencyRequest.location}, ${emergencyRequest.city}</p>
          </div>

          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2e7d32;">Contact Information:</h3>
            <p><strong>Contact Person:</strong> ${emergencyRequest.contactPerson}</p>
            <p><strong>Phone:</strong> ${emergencyRequest.contactPhone}</p>
            <p><strong>Organisation:</strong> ${emergencyRequest.organisation?.organisationName || 'Blood Bank'}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; color: #1976d2;">
              <strong>Your blood group ${emergencyRequest.bloodGroup} is urgently needed!</strong>
            </p>
            <p>Please contact the organisation immediately if you can donate.</p>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #666;">
              This is an automated emergency broadcast from LifeLink. Please respond directly to the organisation.
            </p>
          </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Error sending emergency email: ", error);
  }
};

// Get all emergency requests for admin
const getAllEmergencyRequests = async (req, res) => {
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
        message: "Only admins can view all emergency requests" 
      });
    }

    const emergencyRequests = await emergencyRequestModel.find()
      .populate('organisation', 'organisationName email phone')
      .populate('eligibleDonors.donor', 'name email phone bloodGroup city')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      emergencyRequests,
    });
  } catch (error) {
    console.log("Error in getting emergency requests: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get organisation's emergency requests
const getOrganisationEmergencyRequests = async (req, res) => {
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
        message: "Only organisations can view their emergency requests" 
      });
    }

    const emergencyRequests = await emergencyRequestModel.find({ organisation: user.userId })
      .populate('eligibleDonors.donor', 'name email phone bloodGroup city')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      emergencyRequests,
    });
  } catch (error) {
    console.log("Error in getting organisation emergency requests: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Admin cancel/block emergency request
const updateEmergencyRequestStatus = async (req, res) => {
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
        message: "Only admins can update emergency request status" 
      });
    }

    if (!['cancelled', 'blocked'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status. Must be 'cancelled' or 'blocked'" 
      });
    }

    const emergencyRequest = await emergencyRequestModel.findById(id);
    if (!emergencyRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Emergency request not found" 
      });
    }

    emergencyRequest.status = status;
    emergencyRequest.adminNotes = adminNotes;
    
    if (status === 'cancelled') {
      emergencyRequest.cancelledBy = user.userId;
      emergencyRequest.cancelledAt = new Date();
    }

    await emergencyRequest.save();

    return res.status(200).json({
      success: true,
      message: `Emergency request ${status} successfully`,
      emergencyRequest,
    });
  } catch (error) {
    console.log("Error in updating emergency request status: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get emergency requests for donors
const getDonorEmergencyRequests = async (req, res) => {
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
        message: "Only donors can view emergency requests" 
      });
    }

    // Get active emergency requests that match donor's blood group or are universal (O-)
    const emergencyRequests = await emergencyRequestModel.find({
      status: 'active',
      $or: [
        { bloodGroup: userData.bloodGroup },
        { bloodGroup: 'O-' } // O- can donate to anyone
      ]
    })
      .populate('organisation', 'organisationName email phone address')
      .sort({ urgency: -1, createdAt: -1 }); // Sort by urgency first, then by date

    return res.status(200).json({
      success: true,
      emergencyRequests,
      donorBloodGroup: userData.bloodGroup,
    });
  } catch (error) {
    console.log("Error in getting donor emergency requests: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get emergency request statistics
const getEmergencyRequestStats = async (req, res) => {
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
        message: "Only admins can view emergency request statistics" 
      });
    }

    const stats = await emergencyRequestModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRequests = await emergencyRequestModel.countDocuments();
    const activeRequests = await emergencyRequestModel.countDocuments({ status: 'active' });
    const fulfilledRequests = await emergencyRequestModel.countDocuments({ status: 'fulfilled' });

    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });

    return res.status(200).json({
      success: true,
      stats: {
        total: totalRequests,
        active: activeRequests,
        fulfilled: fulfilledRequests,
        cancelled: statsMap.cancelled || 0,
        blocked: statsMap.blocked || 0,
      }
    });
  } catch (error) {
    console.log("Error in getting emergency request stats: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Mark emergency request as fulfilled and send follow-up notifications
const markEmergencyRequestFulfilled = async (req, res) => {
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
    
    // Only organisations can mark emergency requests as fulfilled
    if (userData.role !== 'organisation') {
      return res.status(403).json({ 
        success: false, 
        message: "Only organisations can mark emergency requests as fulfilled" 
      });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const emergencyRequest = await emergencyRequestModel.findById(id);
    if (!emergencyRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Emergency request not found" 
      });
    }

    if (String(emergencyRequest.organisation) !== String(user.userId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only mark your own emergency requests as fulfilled" 
      });
    }

    if (emergencyRequest.status === 'fulfilled') {
      return res.status(400).json({ 
        success: false, 
        message: "Emergency request is already marked as fulfilled" 
      });
    }

    // Update status
    emergencyRequest.status = 'fulfilled';
    emergencyRequest.fulfilledAt = new Date();
    emergencyRequest.fulfilledBy = user.userId;
    emergencyRequest.fulfillmentNotes = notes || '';

    await emergencyRequest.save();

    // Send follow-up notifications to all notified donors
    await sendFollowUpNotifications(emergencyRequest);

    return res.status(200).json({
      success: true,
      message: "Emergency request marked as fulfilled and follow-up notifications sent",
      emergencyRequest,
    });
  } catch (error) {
    console.log("Error in marking emergency request as fulfilled: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Send follow-up notifications to donors
const sendFollowUpNotifications = async (emergencyRequest) => {
  try {
    if (!emergencyRequest.eligibleDonors || emergencyRequest.eligibleDonors.length === 0) {
      console.log("No eligible donors to notify for follow-up");
      return;
    }

    const notifiedDonors = emergencyRequest.eligibleDonors.filter(donor => donor.notified);
    
    for (const donorInfo of notifiedDonors) {
      const donor = await userModel.findById(donorInfo.donor);
      if (donor && donor.email) {
        await sendFollowUpEmail(donor, emergencyRequest);
      }
    }

    console.log(`Follow-up notifications sent to ${notifiedDonors.length} donors`);

  } catch (error) {
    console.log("Error in sending follow-up notifications: ", error);
  }
};

// Send follow-up email to donor
const sendFollowUpEmail = async (donor, emergencyRequest) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: donor.email,
      subject: `✅ Emergency Blood Request Fulfilled - ${emergencyRequest.bloodGroup} - LifeLink`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #2e7d32; text-align: center;">✅ Emergency Request Fulfilled</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi <strong>${donor.name}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Great news! The emergency blood request for <strong>${emergencyRequest.bloodGroup}</strong> that we notified you about has been successfully fulfilled.
            </p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2e7d32;">Request Details:</h3>
              <p><strong>Blood Group:</strong> ${emergencyRequest.bloodGroup}</p>
              <p><strong>Quantity Required:</strong> ${emergencyRequest.quantity} ml</p>
              <p><strong>Location:</strong> ${emergencyRequest.location}, ${emergencyRequest.city}</p>
              <p><strong>Organisation:</strong> ${emergencyRequest.organisation?.organisationName || 'Blood Bank'}</p>
              <p><strong>Fulfilled At:</strong> ${new Date(emergencyRequest.fulfilledAt).toLocaleString()}</p>
            </div>

            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2;">Thank You for Your Support!</h3>
              <p style="color: #1976d2; margin: 0;">
                Your willingness to help during emergencies makes a real difference in saving lives. 
                We appreciate your commitment to the community and encourage you to continue being a part of our life-saving mission.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #666;">
                <strong>Stay connected with LifeLink for future opportunities to help!</strong>
              </p>
            </div>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666;">
                This is an automated follow-up notification from LifeLink Blood Bank.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Error sending follow-up email: ", error);
  }
};

// Delete emergency request (organisation only)
const deleteEmergencyRequest = async (req, res) => {
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
    
    // Only organisations can delete their own emergency requests
    if (userData.role !== 'organisation') {
      return res.status(403).json({ 
        success: false, 
        message: "Only organisations can delete emergency requests" 
      });
    }

    const { id } = req.params;

    const emergencyRequest = await emergencyRequestModel.findById(id);
    if (!emergencyRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Emergency request not found" 
      });
    }

    if (String(emergencyRequest.organisation) !== String(user.userId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only delete your own emergency requests" 
      });
    }

    // Hard delete the emergency request
    await emergencyRequestModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Emergency request deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleting emergency request: ", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

module.exports = {
  createEmergencyRequest,
  getAllEmergencyRequests,
  getOrganisationEmergencyRequests,
  updateEmergencyRequestStatus,
  getEmergencyRequestStats,
  getDonorEmergencyRequests,
  markEmergencyRequestFulfilled,
  deleteEmergencyRequest,
};
