const mongoose = require("mongoose");
const inventoryModel = require("../models/inventoryModel");
const userModel = require("../models/userModel");
const { getOrganisationGroupSummary } = require('./analyticsController');


const createInventoryController = async (req, res) => {
  try {
    const { inventoryType, email, organisation, donorDetails, hospitalId } = req.body;

    // find user making the request
    const user = await userModel.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // donors donate IN to an organisation (provided via email)
    if (inventoryType === "in" && user.role === "donor") {
      // email expected to be organisation email
      const orgUser = await userModel.findOne({ email, role: 'organisation' });
      if (!orgUser) {
        return res.status(400).json({ success: false, message: "Organisation not found for provided email" });
      }
      req.body.donor = user._id;
      req.body.organisation = orgUser._id;

      // enforce age and auto-assign quantity based on weight
      const donorAge = user.age || donorDetails?.age;
      const donorWeight = user.weight || donorDetails?.weight;
      if (donorAge && (donorAge < 18 || donorAge > 65)) {
        return res.status(400).json({ success: false, message: "Donation rejected: age must be between 18 and 65" });
      }
      if (donorWeight) {
        req.body.quantity = donorWeight >= 55 ? 450 : 350;
      }
    }

    // organisations can create IN on behalf of a donor (email is donor email)
    if (inventoryType === "in" && user.role === "organisation") {
      const donorUser = await userModel.findOne({ email, role: 'donor' });
      if (!donorUser) {
        return res.status(400).json({ success: false, message: "Donor not found for provided email" });
      }
      req.body.donor = donorUser._id;
      req.body.organisation = user._id;

      // enforce donor age and auto-assign quantity using donor profile if available or provided in donorDetails
      const donorAge = donorUser.age || donorDetails?.age;
      const donorWeight = donorUser.weight || donorDetails?.weight;
      if (donorAge && (donorAge < 18 || donorAge > 65)) {
        return res.status(400).json({ success: false, message: "Donation rejected: donor age must be between 18 and 65" });
      }
      if (donorWeight) {
        req.body.quantity = donorWeight >= 55 ? 450 : 350;
      }
    }

    // organisations create OUT for a hospital (prefer explicit hospitalId, otherwise find by email)
    if (inventoryType === "out" && user.role === "organisation") {
      let hospitalUser = null;
      if (hospitalId) {
        hospitalUser = await userModel.findOne({ _id: hospitalId, role: 'hospital' });
      }
      if (!hospitalUser && email) {
        hospitalUser = await userModel.findOne({ email, role: 'hospital' });
      }
      if (!hospitalUser) {
        return res.status(400).json({ success: false, message: "Hospital not found for provided identifier" });
      }
      req.body.hospital = hospitalUser._id;
      req.body.organisation = user._id;
    }

    // hospitals are not allowed to create inventory directly in this simplified flow
    if (user.role === 'hospital' && (inventoryType === 'in' || inventoryType === 'out')) {
      return res.status(403).json({ success: false, message: "Hospitals cannot create inventory directly" });
    }

    // For donor IN, require basic donor details & confirmation
    if (inventoryType === 'in' && user.role === 'donor') {
      if (!donorDetails || !donorDetails.eligibility?.confirmation) {
        return res.status(400).json({ success: false, message: "Please confirm your details before donating" });
      }
    }

    const inventory = new inventoryModel(req.body);
    await inventory.save();

    return res.status(201).json({
      success: true,
      message: "New inventory record created",
      inventory,
    });

  } 

  catch (error) {
    console.log("Error in creating inventory: ", error);
    return res.status(500).json({ success: false, message: "Server error", error });
  }
};


const getInventoryController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    const query = {};
    if (user.role === 'organisation') {
      query.organisation = req.user.userId;
    }
    const inventory = await inventoryModel
      .find(query)
      .populate("donor")
      .populate("hospital")
      .populate("organisation")
      .sort({ createdAt: -1 });
    return res.status(200).send({
      success: true,
      message: "get all record successfully",
      inventory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in getting all inventory",
      error,
    });
  }
};

const getInventoryHospitalController = async (req, res) => {
  try {
    const inventory = await inventoryModel
      .find(req.body.filters)
      .populate("donor")
      .populate("hospital")
      .populate("organisation")
      .sort({ createdAt: -1 });
    return res.status(200).send({
      success: true,
      messaage: "get hospital comsumer records successfully",
      inventory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Get consumer Inventory",
      error,
    });
  }
};


// GET BLOOD RECORD OF 3
const getRecentInventoryController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    const query = {};
    if (user.role === 'organisation') {
      query.organisation = req.user.userId;
    }
    const inventory = await inventoryModel
      .find(query)
      .limit(3)
      .sort({ createdAt: -1 });
    return res.status(200).send({
      success: true,
      message: "recent Invenotry Data",
      inventory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Recent Inventory API",
      error,
    });
  }
};

// Stock summary per blood group for the current organisation
const getStockSummaryController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user || user.role !== 'organisation') {
      return res.status(403).send({ success: false, message: 'Only organisations can view stock summary' });
    }
    const availability = await getOrganisationGroupSummary(user._id);
    const org = await userModel.findById(user._id).select('minStockByGroup');
    const defaultThresholds = new Map([["O+",22500],["A+",18000],["B+",15750],["AB+",6750],["O-",4500],["A-",4500],["B-",4500],["AB-",2250]]);
    const minMap = org?.minStockByGroup && ((typeof org.minStockByGroup.get === 'function') ? org.minStockByGroup : new Map(Object.entries(org.minStockByGroup))) || defaultThresholds;
    const groups = ["O+","O-","AB+","AB-","A+","A-","B+","B-"];
    const lowOnly = String(req.query.lowOnly || 'false') === 'true';

    // compute last updated per group
    const lastUpdatesAgg = await inventoryModel.aggregate([
      { $match: { organisation: new mongoose.Types.ObjectId(user._id) } },
      { $group: { _id: "$bloodGroup", lastUpdated: { $max: "$updatedAt" } } }
    ]);
    const lastMap = lastUpdatesAgg.reduce((acc, r) => { acc[r._id] = r.lastUpdated; return acc; }, {});

    const rows = groups.map(g => {
      const qty = availability[g] || 0;
      const min = (typeof minMap.get === 'function') ? (minMap.get(g) || 0) : (minMap[g] || 0);
      const status = qty < min ? 'low' : 'sufficient';
      return { bloodGroup: g, available: qty, min, status, lastUpdated: lastMap[g] || null };
    }).filter(r => (lowOnly ? r.status === 'low' : true));

    return res.status(200).send({ success: true, rows });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error computing stock summary', error });
  }
};

// Donor stats for current organisation
const getDonorStatsController = async (req, res) => {
  try {
    const orgId = req.user.userId;
    const donors = await inventoryModel.aggregate([
      { $match: { organisation: new mongoose.Types.ObjectId(orgId), inventoryType: 'in' } },
      { $group: { _id: "$donor", totalQuantity: { $sum: "$quantity" }, lastDonation: { $max: "$createdAt" }, count: { $sum: 1 }, bloodGroups: { $addToSet: "$bloodGroup" } } },
    ]);
    const populated = await userModel.find({ _id: { $in: donors.map(d => d._id) } }).select('name email phone');
    const map = new Map(populated.map(u => [String(u._id), u]));
    const rows = donors.map(d => ({
      donorId: d._id,
      name: map.get(String(d._id))?.name || 'Donor',
      contact: map.get(String(d._id))?.phone || map.get(String(d._id))?.email || '-',
      totalDonationsCount: d.count,
      lastDonationDate: d.lastDonation,
      totalQuantity: d.totalQuantity,
      bloodGroups: d.bloodGroups,
    }));
    return res.status(200).send({ success: true, rows });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error computing donor stats', error });
  }
};

// Hospital stats and totals for current organisation
const getHospitalStatsController = async (req, res) => {
  try {
    const orgId = req.user.userId;
    // total requested via request model
    const requestsAgg = await require('../models/requestModel').aggregate([
      { $match: { organisation: new mongoose.Types.ObjectId(orgId) } },
      { $group: { _id: "$hospital", totalRequested: { $sum: "$quantity" }, lastRequest: { $max: "$createdAt" } } }
    ]);
    let rows = [];
    if (requestsAgg.length > 0) {
      const hospitals = await userModel.find({ _id: { $in: requestsAgg.map(r => r._id) } }).select('hospitalName address phone website email createdAt');
      const map = new Map(hospitals.map(h => [String(h._id), h]));
      rows = requestsAgg.map(r => ({
        hospitalId: r._id,
        name: map.get(String(r._id))?.hospitalName || 'Hospital',
        address: map.get(String(r._id))?.address || '-',
        contact: map.get(String(r._id))?.phone || '-',
        email: map.get(String(r._id))?.email || '',
        website: map.get(String(r._id))?.website || '',
        totalRequested: r.totalRequested,
        lastRequestDate: r.lastRequest,
      }));
    } else {
      // Fallback: hospitals that interacted via inventory or explicitly connected
      const inventoryHospIds = await inventoryModel.distinct("hospital", { organisation: new mongoose.Types.ObjectId(orgId) });
      const org = await userModel.findById(orgId).select('connectedHospitals');
      const set = new Set([...(org?.connectedHospitals || []).map(String), ...inventoryHospIds.map(String)]);
      const allIds = Array.from(set);
      const hospitals = await userModel.find({ _id: { $in: allIds } }).select('hospitalName address phone website email createdAt');
      rows = hospitals.map(h => ({
        hospitalId: h._id,
        name: h.hospitalName || 'Hospital',
        address: h.address || '-',
        contact: h.phone || '-',
        email: h.email || '',
        website: h.website || '',
        totalRequested: 0,
        lastRequestDate: null,
      }));
    }

    // Enrich with donation (OUT) totals and last donation info
    if (rows.length > 0) {
      const rowsById = new Map(rows.map(r => [String(r.hospitalId), r]));
      const ids = rows.map(r => r.hospitalId);
      const outAgg = await inventoryModel.aggregate([
        { $match: { organisation: new mongoose.Types.ObjectId(orgId), inventoryType: 'out', hospital: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: { hospital: "$hospital" }, totalDonated: { $sum: "$quantity" }, lastDonation: { $max: "$createdAt" } } }
      ]);
      // find last blood group per hospital
      const lastPerHospital = await inventoryModel.aggregate([
        { $match: { organisation: new mongoose.Types.ObjectId(orgId), inventoryType: 'out', hospital: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$hospital", lastBloodGroup: { $first: "$bloodGroup" }, lastDonation: { $first: "$createdAt" } } }
      ]);
      const outMap = new Map(outAgg.map(a => [String(a._id.hospital), a]));
      const lastMap = new Map(lastPerHospital.map(a => [String(a._id), a]));
      rows.forEach(r => {
        const o = outMap.get(String(r.hospitalId));
        const l = lastMap.get(String(r.hospitalId));
        r.totalDonated = o?.totalDonated || 0;
        if (l?.lastDonation) {
          r.lastDonationDate = l.lastDonation;
          r.lastDonationGroup = l.lastBloodGroup || '-';
        } else if (o?.lastDonation) {
          r.lastDonationDate = o.lastDonation;
        }
      });
    }

    return res.status(200).send({ success: true, rows });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error computing hospital stats', error });
  }
};

// Donation history for a specific hospital (OUT records by organisation)
const getHospitalDonationHistoryController = async (req, res) => {
  try {
    const orgId = req.user.userId;
    const { hospitalId } = req.query;
    if (!hospitalId) {
      return res.status(400).send({ success: false, message: 'hospitalId is required' });
    }
    const records = await inventoryModel
      .find({ organisation: orgId, hospital: hospitalId, inventoryType: 'out' })
      .select('bloodGroup quantity createdAt')
      .sort({ createdAt: -1 });
    return res.status(200).send({ success: true, records });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error fetching donation history', error });
  }
};
// List all registered hospitals (for browsing)
const listAllHospitalsController = async (req, res) => {
  try {
    const hospitals = await userModel.find({ role: 'hospital' }).select('_id hospitalName email phone address website');
    return res.status(200).send({ success: true, hospitals });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error listing hospitals', error });
  }
};

// Connect an organisation to a hospital
const connectHospitalController = async (req, res) => {
  try {
    const orgId = req.user.userId;
    const { hospitalId } = req.body;
    
    console.log('Connect hospital request:', { orgId, hospitalId });
    
    const org = await userModel.findById(orgId);
    if (!org || org.role !== 'organisation') {
      return res.status(403).send({ success: false, message: 'Only organisations can connect' });
    }
    const hospital = await userModel.findById(hospitalId);
    if (!hospital || hospital.role !== 'hospital') {
      return res.status(400).send({ success: false, message: 'Invalid hospital' });
    }
    
    const connectedHospitals = org.connectedHospitals || [];
    if (!connectedHospitals.find(id => String(id) === String(hospitalId))) {
      connectedHospitals.push(hospitalId);
      await userModel.updateOne(
        { _id: orgId }, 
        { $set: { connectedHospitals: connectedHospitals } }
      );
      console.log('Hospital connected successfully:', { orgId, hospitalId, connectedHospitals: connectedHospitals });
    } else {
      console.log('Hospital already connected:', { orgId, hospitalId });
    }
    
    return res.status(200).send({ success: true, message: 'Hospital connected' });
  } catch (error) {
    console.log('Error connecting hospital:', error);
    return res.status(500).send({ success: false, message: 'Error connecting hospital', error });
  }
};


const getDonorsController = async (req, res) => {
  try {
    const organisation = req.user.userId;
    
    // Get all donors (not just those who donated to this organisation)
    const donors = await userModel.find({ role: 'donor' });

    // Get donation information for each donor
    const donorsWithDonationInfo = await Promise.all(
      donors.map(async (donor) => {
        // Get donation history for this donor with this organisation
        const donationHistory = await inventoryModel.find({
          donor: donor._id,
          organisation: organisation,
          inventoryType: 'in'
        }).sort({ createdAt: -1 });

        // Calculate donation statistics
        const totalDonations = donationHistory.length;
        const totalQuantity = donationHistory.reduce((sum, donation) => sum + (donation.quantity || 0), 0);
        const lastDonation = donationHistory.length > 0 ? donationHistory[0] : null;
        const bloodGroupsDonated = [...new Set(donationHistory.map(d => d.bloodGroup))];

        return {
          ...donor.toObject(),
          donationInfo: {
            totalDonations,
            totalQuantity,
            lastDonationDate: lastDonation?.createdAt,
            lastDonationQuantity: lastDonation?.quantity,
            lastDonationBloodGroup: lastDonation?.bloodGroup,
            bloodGroupsDonated
          }
        };
      })
    );

    return res.status(200).send({
      success: true,
      message: "Donor Record Fetched Successfully",
      donors: donorsWithDonationInfo,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in Donor records",
      error,
    });
  }
};

const getHospitalController = async (req, res) => {
  try {
    const organisation = req.user.userId;
    //GET hospital ID
    const hospitalId = await inventoryModel.distinct("hospital", {
      organisation,
    });
    const hospitals = await userModel.find({
      _id: { $in: hospitalId },
    });
    return res.status(200).send({
      success: true,
      message: "Hospitals Data Fetched Successfully",
      hospitals,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in getHospital Api",
      error,
    });
  }
};

const getOrgnaisationController = async (req, res) => {
  try {
    const donor = req.user.userId;
    const orgId = await inventoryModel.distinct("organisation", { donor });
    //find org
    const organisations = await userModel.find({
      _id: { $in: orgId },
    });
    return res.status(200).send({
      success: true,
      message: "Org Data Fetched Successfully",
      organisations,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In ORG API",
      error,
    });
  }
};

const getOrgnaisationForHospitalController = async (req, res) => {
  try {
    const hospital = req.user.userId;
    const orgId = await inventoryModel.distinct("organisation", { hospital });
    //find org
    const organisations = await userModel.find({
      _id: { $in: orgId },
    });
    return res.status(200).send({
      success: true,
      message: "Hospital Org Data Fetched Successfully",
      organisations,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Hospital ORG API",
      error,
    });
  }
};

// List all organisations (public to authenticated users)
const listAllOrganisationsController = async (req, res) => {
  try {
    const orgs = await userModel.find({ role: 'organisation' }).select('_id organisationName email address phone website minStockByGroup');
    // compute availability and needed per org
    const organisations = await Promise.all(orgs.map(async (o) => {
      const availability = await getOrganisationGroupSummary(o._id);
      const defaultThresholds = new Map([["O+",22500],["A+",18000],["B+",15750],["AB+",6750],["O-",4500],["A-",4500],["B-",4500],["AB-",2250]]);
      const minMap = o.minStockByGroup && ((typeof o.minStockByGroup.get === 'function') ? o.minStockByGroup : new Map(Object.entries(o.minStockByGroup))) || defaultThresholds;
      const neededBloodGroups = [];
      const availabilityWithNeeded = {};
      Object.entries(availability).forEach(([g, qty]) => {
        const min = (typeof minMap.get === 'function') ? (minMap.get(g) || 0) : (minMap[g] || 0);
        const needed = qty < min;
        if (needed) neededBloodGroups.push(g);
        availabilityWithNeeded[g] = qty;
      });
      return { ...o.toObject(), availability: availabilityWithNeeded, neededBloodGroups };
    }));
    return res.status(200).send({ success: true, organisations });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: 'Error fetching organisations', error });
  }
};

module.exports = {
  createInventoryController,
  getInventoryController,
  getHospitalController,
  getDonorsController,
  getOrgnaisationController,
  getOrgnaisationForHospitalController,
  getInventoryHospitalController,
  getRecentInventoryController,
  listAllOrganisationsController,
  getStockSummaryController,
  getDonorStatsController,
  getHospitalStatsController,
  getHospitalDonationHistoryController,
  listAllHospitalsController,
  connectHospitalController,
};
