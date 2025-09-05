const donorRequestModel = require("../models/donorRequestModel");
const userModel = require("../models/userModel");
const inventoryModel = require("../models/inventoryModel");
const mongoose = require('mongoose');

// Donor creates a request to donate blood to an organisation
const createDonorRequest = async (req, res) => {
  try {
    const donor = await userModel.findById(req.user.userId);
    if (!donor || donor.role !== 'donor') {
      return res.status(403).send({ 
        success: false, 
        message: 'Only donors can create donation requests' 
      });
    }

    const { organisationId, bloodGroup, quantity, notes } = req.body;
    
    if (!organisationId || !bloodGroup || !quantity) {
      return res.status(400).send({ 
        success: false, 
        message: 'Missing required fields: organisationId, bloodGroup, quantity' 
      });
    }

    // Validate quantity
    if (quantity < 1 || quantity > 500) {
      return res.status(400).send({ 
        success: false, 
        message: 'Quantity must be between 1 and 500 ml' 
      });
    }

    // Check if donor's blood group matches the request
    if (donor.bloodGroup !== bloodGroup) {
      return res.status(400).send({ 
        success: false, 
        message: 'Your blood group does not match the requested blood group' 
      });
    }

    // Verify organisation exists
    const organisation = await userModel.findById(organisationId);
    if (!organisation || organisation.role !== 'organisation') {
      return res.status(400).send({ 
        success: false, 
        message: 'Invalid organisation' 
      });
    }

    // Check if donor has any pending requests to the same organisation
    const existingRequest = await donorRequestModel.findOne({
      donor: donor._id,
      organisation: organisationId,
      status: 'pending',
      isDeleted: false
    });

    if (existingRequest) {
      return res.status(400).send({ 
        success: false, 
        message: 'You already have a pending request to this organisation' 
      });
    }

    // Create the donor request
    const donorRequest = await donorRequestModel.create({
      donor: donor._id,
      organisation: organisationId,
      bloodGroup,
      quantity,
      notes: notes || ''
    });

    // Populate the request with donor and organisation details
    await donorRequest.populate('donor organisation');

    return res.status(201).send({ 
      success: true, 
      message: 'Donation request created successfully', 
      request: donorRequest 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error creating donation request', 
      error 
    });
  }
};

// Get donor's own requests
const getDonorRequests = async (req, res) => {
  try {
    const donor = req.user.userId;
    const requests = await donorRequestModel
      .find({ donor, isDeleted: false })
      .populate('organisation', 'organisationName email phone address')
      .sort({ createdAt: -1 });

    return res.status(200).send({ 
      success: true, 
      requests,
      count: requests.length 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error fetching donor requests', 
      error 
    });
  }
};

// Get organisation's received donor requests
const getOrganisationDonorRequests = async (req, res) => {
  try {
    const organisation = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { organisation, isDeleted: false };
    if (status) {
      query.status = status;
    }

    const requests = await donorRequestModel
      .find(query)
      .populate('donor', 'name email phone bloodGroup age weight')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await donorRequestModel.countDocuments(query);

    return res.status(200).send({ 
      success: true, 
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error fetching organisation donor requests', 
      error 
    });
  }
};

// Organisation approves a donor request
const approveDonorRequest = async (req, res) => {
  try {
    const orgUser = await userModel.findById(req.user.userId);
    if (!orgUser || orgUser.role !== 'organisation') {
      return res.status(403).send({ 
        success: false, 
        message: 'Only organisations can approve donor requests' 
      });
    }

    const { id } = req.params;
    const { appointmentDate, appointmentTime, location, notes } = req.body;

    if (!appointmentDate || !appointmentTime || !location) {
      return res.status(400).send({ 
        success: false, 
        message: 'Missing required fields: appointmentDate, appointmentTime, location' 
      });
    }

    const donorRequest = await donorRequestModel.findById(id);
    if (!donorRequest || String(donorRequest.organisation) !== String(orgUser._id)) {
      return res.status(404).send({ 
        success: false, 
        message: 'Donor request not found' 
      });
    }

    if (donorRequest.status !== 'pending') {
      return res.status(400).send({ 
        success: false, 
        message: 'Request is not in pending status' 
      });
    }

    // Update the request with approval details
    donorRequest.status = 'approved';
    donorRequest.appointmentDate = new Date(appointmentDate);
    donorRequest.appointmentTime = appointmentTime;
    donorRequest.location = location;
    donorRequest.notes = notes || donorRequest.notes;

    await donorRequest.save();
    await donorRequest.populate('donor organisation');

    return res.status(200).send({ 
      success: true, 
      message: 'Donor request approved successfully', 
      request: donorRequest 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error approving donor request', 
      error 
    });
  }
};

// Organisation rejects a donor request
const rejectDonorRequest = async (req, res) => {
  try {
    const orgUser = await userModel.findById(req.user.userId);
    if (!orgUser || orgUser.role !== 'organisation') {
      return res.status(403).send({ 
        success: false, 
        message: 'Only organisations can reject donor requests' 
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).send({ 
        success: false, 
        message: 'Reason is required for rejection' 
      });
    }

    const donorRequest = await donorRequestModel.findById(id);
    if (!donorRequest || String(donorRequest.organisation) !== String(orgUser._id)) {
      return res.status(404).send({ 
        success: false, 
        message: 'Donor request not found' 
      });
    }

    if (donorRequest.status !== 'pending') {
      return res.status(400).send({ 
        success: false, 
        message: 'Request is not in pending status' 
      });
    }

    donorRequest.status = 'rejected';
    donorRequest.reason = reason;
    await donorRequest.save();
    await donorRequest.populate('donor organisation');

    return res.status(200).send({ 
      success: true, 
      message: 'Donor request rejected', 
      request: donorRequest 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error rejecting donor request', 
      error 
    });
  }
};

// Organisation marks donation as completed (after collecting blood)
const markDonationCompleted = async (req, res) => {
  try {
    const orgUser = await userModel.findById(req.user.userId);
    if (!orgUser || orgUser.role !== 'organisation') {
      return res.status(403).send({ 
        success: false, 
        message: 'Only organisations can mark donations as completed' 
      });
    }

    const { id } = req.params;
    const { actualQuantity } = req.body;

    const donorRequest = await donorRequestModel.findById(id);
    if (!donorRequest || String(donorRequest.organisation) !== String(orgUser._id)) {
      return res.status(404).send({ 
        success: false, 
        message: 'Donor request not found' 
      });
    }

    if (donorRequest.status !== 'approved') {
      return res.status(400).send({ 
        success: false, 
        message: 'Request must be approved before marking as completed' 
      });
    }

    // Create inventory record for the collected blood
    const collectedQuantity = actualQuantity || donorRequest.quantity;
    
    const inventoryRecord = await inventoryModel.create({
      inventoryType: 'in',
      bloodGroup: donorRequest.bloodGroup,
      quantity: collectedQuantity,
      donor: donorRequest.donor,
      organisation: donorRequest.organisation,
      email: orgUser.email,
      donorDetails: {
        eligibility: {
          confirmation: true,
          age: true,
          weight: true,
          noMedicationOrMajorIllness: true,
          noFeverColdInfection: true
        }
      }
    });

    // Update the donor request status
    donorRequest.status = 'completed';
    await donorRequest.save();
    await donorRequest.populate('donor organisation');

    return res.status(200).send({ 
      success: true, 
      message: 'Donation marked as completed successfully', 
      request: donorRequest,
      inventoryRecord
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error marking donation as completed', 
      error 
    });
  }
};

// Organisation cancels/soft deletes a donor request
const cancelDonorRequest = async (req, res) => {
  try {
    const orgUser = await userModel.findById(req.user.userId);
    if (!orgUser || orgUser.role !== 'organisation') {
      return res.status(403).send({ 
        success: false, 
        message: 'Only organisations can cancel donor requests' 
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const donorRequest = await donorRequestModel.findById(id);
    if (!donorRequest || String(donorRequest.organisation) !== String(orgUser._id)) {
      return res.status(404).send({ 
        success: false, 
        message: 'Donor request not found' 
      });
    }

    if (donorRequest.status === 'completed') {
      return res.status(400).send({ 
        success: false, 
        message: 'Cannot cancel a completed donation' 
      });
    }

    // Soft delete the request
    donorRequest.isDeleted = true;
    donorRequest.deletedAt = new Date();
    donorRequest.deletedBy = orgUser._id;
    donorRequest.status = 'cancelled';
    donorRequest.reason = reason || 'Cancelled by organisation';

    await donorRequest.save();

    return res.status(200).send({ 
      success: true, 
      message: 'Donor request cancelled successfully' 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error cancelling donor request', 
      error 
    });
  }
};

// Get cancelled/fulfilled requests for admin (with soft delete support)
const getDonorRequestHistory = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { isDeleted: true };
    if (status) {
      query.status = status;
    }

    const requests = await donorRequestModel
      .find(query)
      .populate('donor', 'name email phone bloodGroup')
      .populate('organisation', 'organisationName email phone')
      .populate('deletedBy', 'organisationName')
      .sort({ deletedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await donorRequestModel.countDocuments(query);

    return res.status(200).send({ 
      success: true, 
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ 
      success: false, 
      message: 'Error fetching donor request history', 
      error 
    });
  }
};

module.exports = {
  createDonorRequest,
  getDonorRequests,
  getOrganisationDonorRequests,
  approveDonorRequest,
  rejectDonorRequest,
  markDonationCompleted,
  cancelDonorRequest,
  getDonorRequestHistory
};
