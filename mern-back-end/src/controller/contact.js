const ContactSubmission = require("../models/contactSubmission");

exports.submitContactMessage = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!name || !phone || !message) return res.status(400).json({ message: "Name, phone number, and message are required." });
    if (name.length > 120 || email.length > 254 || phone.length > 24 || subject.length > 160 || message.length > 5000) return res.status(400).json({ message: "One or more fields exceed the allowed length." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (phone.replace(/[^\d]/g, "").length < 7) return res.status(400).json({ message: "Enter a valid phone number." });
    const submission = await ContactSubmission.create({ name, email, phone, subject, message });
    return res.status(201).json({ message: "Your message has been sent to Subazen support.", id: submission._id });
  } catch (error) {
    console.error("Contact form submission failed:", error.message);
    return res.status(500).json({ message: "Could not send your message. Please try again." });
  }
};

exports.listContactMessages = async (_req, res) => {
  try {
    const submissions = await ContactSubmission.find({}).sort({ createdAt: -1 }).limit(500).lean().exec();
    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Contact inbox lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load contact messages." });
  }
};

exports.updateContactMessage = async (req, res) => {
  try {
    const allowed = ["new", "read", "resolved"];
    if (!allowed.includes(req.body?.status)) return res.status(400).json({ message: "Choose a valid message status." });
    const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { returnDocument: "after", runValidators: true }).lean().exec();
    if (!submission) return res.status(404).json({ message: "Contact message not found." });
    return res.status(200).json({ submission });
  } catch (error) {
    return res.status(400).json({ message: "Could not update the contact message." });
  }
};
