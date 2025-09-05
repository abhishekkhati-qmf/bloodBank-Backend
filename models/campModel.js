const mongoose = require("mongoose");

const campSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Camp name is required"],
    },
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Organisation is required"],
    },
    description: {
      type: String,
      required: [true, "Camp description is required"],
    },
    date: {
      type: Date,
      required: [true, "Camp date is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    bloodGroups: [{
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: [true, "At least one blood group is required"],
    }],
    expectedDonors: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    adminNotes: {
      type: String,
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person is required"],
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
    },
    facilities: [{
      type: String,
    }],
    requirements: [{
      type: String,
    }],
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
campSchema.index({ status: 1, date: 1 });
campSchema.index({ organisation: 1 });
campSchema.index({ city: 1 });
campSchema.index({ bloodGroups: 1 });

module.exports = mongoose.model("Camp", campSchema);
