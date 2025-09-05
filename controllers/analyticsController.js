const inventoryModel = require("../models/inventoryModel");
const mongoose = require("mongoose");
const userModel = require("../models/userModel");
//GET BLOOD DATA
const bloodGroupDetailsContoller = async (req, res) => {
  try {
    const bloodGroups = ["O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"];
    const bloodGroupData = [];

    const user = await userModel.findById(req.user.userId);
    const isOrganisation = user?.role === 'organisation';
    const organisation = isOrganisation ? new mongoose.Types.ObjectId(user._id) : null;

    // fetch min thresholds for current organisation if applicable
    const defaultThresholds = new Map([["O+",22500],["A+",18000],["B+",15750],["AB+",6750],["O-",4500],["A-",4500],["B-",4500],["AB-",2250]]);
    const minMap = isOrganisation
      ? (user.minStockByGroup && ((typeof user.minStockByGroup.get === 'function') ? user.minStockByGroup : new Map(Object.entries(user.minStockByGroup))) || defaultThresholds)
      : null;

    await Promise.all(
      bloodGroups.map(async (bloodGroup) => {
        const matchIn = { bloodGroup, inventoryType: "in" };
        const matchOut = { bloodGroup, inventoryType: "out" };
        if (organisation) { matchIn.organisation = organisation; matchOut.organisation = organisation; }
        const totalIn = await inventoryModel.aggregate([{ $match: matchIn }, { $group: { _id: null, total: { $sum: "$quantity" } } }]);
        const totalOut = await inventoryModel.aggregate([{ $match: matchOut }, { $group: { _id: null, total: { $sum: "$quantity" } } }]);
        const availabeBlood = (totalIn[0]?.total || 0) - (totalOut[0]?.total || 0);
        let min = 0;
        if (isOrganisation) {
          min = (typeof minMap.get === 'function') ? (minMap.get(bloodGroup) || 0) : (minMap?.[bloodGroup] || 0);
        }
        const needed = isOrganisation ? (availabeBlood < min) : false;
        bloodGroupData.push({ bloodGroup, totalIn: totalIn[0]?.total || 0, totalOut: totalOut[0]?.total || 0, availabeBlood, min, needed });
      })
    );

    return res.status(200).send({ success: true, message: "Blood Group Data Fetch Successfully", bloodGroupData });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: "Error In Bloodgroup Data Analytics API", error });
  }
};

// Helper to compute available units per group for a given organisation id
const getOrganisationGroupSummary = async (organisationId) => {
  const groups = ["O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"];
  const result = {};
  for (const g of groups) {
    const [inAgg] = await inventoryModel.aggregate([{ $match: { organisation: new mongoose.Types.ObjectId(organisationId), bloodGroup: g, inventoryType: 'in' } }, { $group: { _id: null, total: { $sum: "$quantity" } } }]);
    const [outAgg] = await inventoryModel.aggregate([{ $match: { organisation: new mongoose.Types.ObjectId(organisationId), bloodGroup: g, inventoryType: 'out' } }, { $group: { _id: null, total: { $sum: "$quantity" } } }]);
    result[g] = (inAgg?.total || 0) - (outAgg?.total || 0);
  }
  return result;
};

module.exports = { bloodGroupDetailsContoller, getOrganisationGroupSummary };