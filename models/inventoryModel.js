const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    inventoryType: {
      type: String,
      required: [true, "inventory type is required"],
      enum: ["in", "out"],
    },
    bloodGroup: {
      type: String,
      required: [true, "blood group is required"],
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    quantity: {
      type: Number,
      required: [true, "blood quantity is required"],
    },
    donorDetails: {
      fullName: { type: String },
      age: { type: Number },
      gender: { type: String, enum: ["male","female","other"] },
      bloodGroup: { type: String, enum: ["A+","A-","B+","B-","AB+","AB-","O+","O-"] },
      contact: { type: String },
      address: { type: String },
      city: { type: String },
      eligibility: {
        over18Under65: { type: Boolean },
        weightOver50: { type: Boolean },
        notDonatedIn3Months: { type: Boolean },
        noMedicationOrMajorIllness: { type: Boolean },
        noFeverColdInfection: { type: Boolean },
        confirmation: { type: Boolean },
      }
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: false, // ✅ optional now
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
