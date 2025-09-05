const requestModel = require("../models/requestModel");
const userModel = require("../models/userModel");
const inventoryModel = require("../models/inventoryModel");
const mongoose = require('mongoose');

// Hospital creates a request to an organisation
const createRequest = async (req, res) => {
  try {
    const hospital = await userModel.findById(req.user.userId);
    if (!hospital || hospital.role !== 'hospital') {
      return res.status(403).send({ success: false, message: 'Only hospitals can create requests' });
    }
    const { organisationId, bloodGroup, quantity } = req.body;
    if (!organisationId || !bloodGroup || !quantity) {
      return res.status(400).send({ success: false, message: 'Missing required fields' });
    }
    const organisation = await userModel.findById(organisationId);
    if (!organisation || organisation.role !== 'organisation') {
      return res.status(400).send({ success: false, message: 'Invalid organisation' });
    }

    // Check if organisation has enough blood stock
    const currentStock = await inventoryModel.aggregate([
      { $match: { organisation: new mongoose.Types.ObjectId(organisationId), bloodGroup, inventoryType: 'in' } },
      { $group: { _id: null, totalIn: { $sum: '$quantity' } } }
    ]);
    
    const outStock = await inventoryModel.aggregate([
      { $match: { organisation: new mongoose.Types.ObjectId(organisationId), bloodGroup, inventoryType: 'out' } },
      { $group: { _id: null, totalOut: { $sum: '$quantity' } } }
    ]);
    
    const totalIn = currentStock[0]?.totalIn || 0;
    const totalOut = outStock[0]?.totalOut || 0;
    const availableStock = totalIn - totalOut;
    
    console.log('Blood request stock check:', {
      organisationId,
      bloodGroup,
      quantity,
      totalIn,
      totalOut,
      availableStock,
      willReject: availableStock <= 0
    });

    // Also check if there are any inventory records for this organisation and blood group
    const allInventory = await inventoryModel.find({ 
      organisation: new mongoose.Types.ObjectId(organisationId), 
      bloodGroup 
    });
    console.log('All inventory records for this org and blood group:', allInventory);
    
    // Auto-reject only if no stock available (0 ml)
    if (availableStock <= 0) {
      const request = await requestModel.create({ 
        organisation: organisationId, 
        hospital: hospital._id, 
        bloodGroup, 
        quantity,
        status: 'rejected',
        reason: 'No stock available.'
      });
      return res.status(201).send({ 
        success: true, 
        message: 'Request auto-rejected due to no stock available', 
        request,
        autoRejected: true
      });
    }

    const request = await requestModel.create({ organisation: organisationId, hospital: hospital._id, bloodGroup, quantity });
    return res.status(201).send({ success: true, message: 'Request created', request });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error creating request', error });
  }
};

// Lists for hospital and organisation
const listRequestsForHospital = async (req, res) => {
  try {
    const hospital = req.user.userId;
    const requests = await requestModel.find({ hospital }).populate('organisation').sort({ createdAt: -1 });
    // compute performance summary
    const fulfilled = await requestModel.countDocuments({ hospital, status: 'fulfilled' });
    const responseTimes = await requestModel.aggregate([
      { $match: { hospital: new mongoose.Types.ObjectId(hospital), status: { $in: ['approved','rejected','fulfilled'] } } },
      { $project: { ms: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$ms' } } }
    ]);
    const avgResponseMs = responseTimes[0]?.avgMs || 0;
    return res.status(200).send({ success: true, requests, summary: { totalFulfilled: fulfilled, avgResponseMs } });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error', error });
  }
};

const listRequestsForOrganisation = async (req, res) => {
  try {
    const organisation = req.user.userId;
    const requests = await requestModel.find({ organisation }).populate('hospital');
    return res.status(200).send({ success: true, requests });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error', error });
  }
};

// Organisation approves/rejects
const approveRequest = async (req, res) => {
  try {
    const orgUser = await userModel.findById(req.user.userId);
    if (!orgUser || orgUser.role !== 'organisation') {
      return res.status(403).send({ success: false, message: 'Only organisations can approve' });
    }
    const { id } = req.params;
    const reqDoc = await requestModel.findById(id);
    if (!reqDoc || String(reqDoc.organisation) !== String(orgUser._id)) {
      return res.status(404).send({ success: false, message: 'Request not found' });
    }

    // Check if organisation has enough blood stock
    const currentStock = await inventoryModel.aggregate([
      { $match: { organisation: reqDoc.organisation, bloodGroup: reqDoc.bloodGroup, inventoryType: 'in' } },
      { $group: { _id: null, totalIn: { $sum: '$quantity' } } }
    ]);
    
    const outStock = await inventoryModel.aggregate([
      { $match: { organisation: reqDoc.organisation, bloodGroup: reqDoc.bloodGroup, inventoryType: 'out' } },
      { $group: { _id: null, totalOut: { $sum: '$quantity' } } }
    ]);
    
    const availableStock = (currentStock[0]?.totalIn || 0) - (outStock[0]?.totalOut || 0);
    
    if (availableStock < reqDoc.quantity) {
      return res.status(400).send({ 
        success: false, 
        message: `Insufficient blood stock. Available: ${availableStock}ml, Required: ${reqDoc.quantity}ml` 
      });
    }

    // create OUT inventory record
    const inv = await inventoryModel.create({
      inventoryType: 'out',
      bloodGroup: reqDoc.bloodGroup,
      quantity: reqDoc.quantity,
      hospital: reqDoc.hospital,
      organisation: reqDoc.organisation,
      email: orgUser.email,
    });
    reqDoc.status = 'approved';
    await reqDoc.save();
    return res.status(200).send({ success: true, message: 'Request approved', request: reqDoc, outInventory: inv });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error approving request', error });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const orgUser = await userModel.findById(req.user.userId);
    if (!orgUser || orgUser.role !== 'organisation') {
      return res.status(403).send({ success: false, message: 'Only organisations can reject' });
    }
    const { id } = req.params;
    const { reason } = req.body;
    const reqDoc = await requestModel.findById(id);
    if (!reqDoc || String(reqDoc.organisation) !== String(orgUser._id)) {
      return res.status(404).send({ success: false, message: 'Request not found' });
    }
    reqDoc.status = 'rejected';
    reqDoc.reason = reason || '';
    await reqDoc.save();
    return res.status(200).send({ success: true, message: 'Request rejected', request: reqDoc });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error rejecting request', error });
  }
};

// Hospital can mark fulfilled (after receiving units) or cancel
const markFulfilledByHospital = async (req, res) => {
  try {
    const hospital = await userModel.findById(req.user.userId);
    if (!hospital || hospital.role !== 'hospital') {
      return res.status(403).send({ success: false, message: 'Only hospitals can mark fulfillment' });
    }
    const { id } = req.params;
    const reqDoc = await requestModel.findById(id);
    if (!reqDoc || String(reqDoc.hospital) !== String(hospital._id)) {
      return res.status(404).send({ success: false, message: 'Request not found' });
    }
    reqDoc.status = 'fulfilled';
    await reqDoc.save();
    return res.status(200).send({ success: true, message: 'Request marked fulfilled', request: reqDoc });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error updating request', error });
  }
};

module.exports = {
  createRequest,
  listRequestsForHospital,
  listRequestsForOrganisation,
  approveRequest,
  rejectRequest,
  markFulfilledByHospital,
};


