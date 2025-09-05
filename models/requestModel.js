const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    organisation: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    bloodGroup: { type: String, required: true, enum: ["A+","A-","B+","B-","AB+","AB-","O+","O-"] },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["pending","approved","rejected","fulfilled"], default: "pending" },
    reason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);


