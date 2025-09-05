const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "User is required"],
    },
    token: {
      type: String,
      required: [true, "Verification token is required"],
    },
    type: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: [true, "Token type is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      default: function() {
        // 24 hours for email verification, 1 hour for password reset
        const hours = this.type === "password_reset" ? 1 : 24;
        return new Date(Date.now() + hours * 60 * 60 * 1000);
      },
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
verificationSchema.index({ token: 1 }, { unique: true });
verificationSchema.index({ user: 1, type: 1 });
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Verification", verificationSchema);
