const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: [true, "role is required"],
      enum: ["admin", "organisation", "donor", "hospital"],
    },
    name: {
      type: String,
      required: function () {
        if (this.role === "donor") {
          return true;
        }
        return false;
      },
    },
    organisationName: {
      type: String,
      required: function () {
        if (this.role === "organisation") {
          return true;
        }
        return false;
      },
    },
    hospitalName: {
      type: String,
      required: function () {
        if (this.role === "hospital") {
          return true;
        }
        return false;
      },
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },
    password: {
      type: String,
      required: [true, "password is requied"],
    },
    website: {
      type: String,
    },
    address: {
      type: String,
      required: [true, "address is required"],
    },
    city: {
      type: String,
      required: [true, "city is required"],
    },
    phone: {
      type: String,
      required: [true, "phone number is required"],
    },
    // donor profile fields
    age: {
      type: Number,
      required: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: false,
    },
    weight: {
      type: Number,
      required: false,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: function () {
        return this.role === "donor";
      },
    },
    // Minimum stock thresholds per blood group for organisations (in ml)
    minStockByGroup: {
      type: Map,
      of: Number,
      default: function () {
        // Apply defaults only for organisation role
        if (this.role === "organisation") {
          return new Map([
            ["O+", 22500],
            ["A+", 18000],
            ["B+", 15750],
            ["AB+", 6750],
            ["O-", 4500],
            ["A-", 4500],
            ["B-", 4500],
            ["AB-", 2250],
          ]);
        }
        return undefined;
      },
    },
    // persistent connections for organisations
    connectedHospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
    
    // User status for blocking/unblocking
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    blockedAt: {
      type: Date,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", userSchema);