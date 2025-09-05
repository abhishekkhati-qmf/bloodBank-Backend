const mongoose = require("mongoose");

const donationRequestSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Donor is required"],
    },
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Organisation is required"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: [true, "Blood group is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    responseDate: {
      type: Date,
    },
    responseNotes: {
      type: String,
    },
    completedDate: {
      type: Date,
    },
    cancelledDate: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    cancelledReason: {
      type: String,
    },
    // For tracking the actual donation when completed
    donationRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "inventory",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
donationRequestSchema.index({ donor: 1, status: 1 });
donationRequestSchema.index({ organisation: 1, status: 1 });
donationRequestSchema.index({ status: 1, requestDate: -1 });

module.exports = mongoose.model("DonationRequest", donationRequestSchema);
