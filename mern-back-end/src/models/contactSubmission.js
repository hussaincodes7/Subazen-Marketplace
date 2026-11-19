const mongoose = require("mongoose");

const contactSubmissionSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  phone: { type: String, trim: true, required: true, maxlength: 24 },
  subject: { type: String, trim: true, maxlength: 160, default: "" },
  message: { type: String, trim: true, required: true, maxlength: 5000 },
  status: { type: String, enum: ["new", "read", "resolved"], default: "new", index: true },
}, { timestamps: true });

contactSubmissionSchema.index({ createdAt: -1 });
module.exports = mongoose.model("ContactSubmission", contactSubmissionSchema);
