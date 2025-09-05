const mongoose = require("mongoose");

const emergencyRequestSchema = new mongoose.Schema(
  {
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
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1 ml"],
    },
    urgency: {
      type: String,
      enum: ["high", "critical", "emergency"],
      default: "high",
    },
    reason: {
      type: String,
      required: [true, "Reason for emergency request is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person is required"],
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
    },
    status: {
      type: String,
      enum: ["active", "fulfilled", "cancelled", "blocked"],
      default: "active",
    },
    adminNotes: {
      type: String,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    cancelledAt: {
      type: Date,
    },
    fulfilledAt: {
      type: Date,
    },
    broadcastSent: {
      type: Boolean,
      default: false,
    },
    broadcastSentAt: {
      type: Date,
    },
    eligibleDonors: [{
      donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
      },
      notified: {
        type: Boolean,
        default: false,
      },
      notifiedAt: {
        type: Date,
      },
      response: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending",
      },
      responseAt: {
        type: Date,
      },
    }],
  },
  { timestamps: true }
);

// Index for efficient queries
emergencyRequestSchema.index({ status: 1, bloodGroup: 1, city: 1 });
emergencyRequestSchema.index({ organisation: 1 });
emergencyRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("EmergencyRequest", emergencyRequestSchema);
