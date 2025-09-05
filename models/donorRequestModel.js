const mongoose = require("mongoose");

const donorRequestSchema = new mongoose.Schema(
  {
    donor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "users", 
      required: true 
    },
    organisation: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "users", 
      required: true 
    },
    bloodGroup: { 
      type: String, 
      required: true, 
      enum: ["A+","A-","B+","B-","AB+","AB-","O+","O-"] 
    },
    quantity: { 
      type: Number, 
      required: true,
      min: 1,
      max: 500 // Maximum 500ml per donation
    },
    status: { 
      type: String, 
      enum: ["pending","approved","rejected","completed","cancelled"], 
      default: "pending" 
    },
    reason: { 
      type: String,
      required: function() {
        return this.status === 'rejected';
      }
    },
    appointmentDate: {
      type: Date,
      required: function() {
        return this.status === 'approved';
      }
    },
    appointmentTime: {
      type: String,
      required: function() {
        return this.status === 'approved';
      }
    },
    location: {
      type: String,
      required: function() {
        return this.status === 'approved';
      }
    },
    notes: {
      type: String
    },
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users"
    }
  },
  { timestamps: true }
);

// Index for better query performance
donorRequestSchema.index({ donor: 1, organisation: 1 });
donorRequestSchema.index({ status: 1 });
donorRequestSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("DonorRequest", donorRequestSchema);
