const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../models/user");
const fs = require("fs");
const path = require("path");
const uploadsPath = path.resolve(__dirname, "../../uploads");

const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  };
};

exports.signup = async (req, res) => {
  try {
    const body = req.body ?? {};
    const rawFirstName = body.firstName ?? body.firstname;
    const rawLastName = body.lastName ?? body.lastname;
    const firstName =
      typeof rawFirstName === "string" ? rawFirstName.trim() : "";
    const lastName = typeof rawLastName === "string" ? rawLastName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    if (
      ![firstName, lastName, email, password].every(
        (value) => typeof value === "string" && value.trim(),
      )
    ) {
      return res
        .status(400)
        .json({
          message: "firstName, lastName, email, and password are required",
        });
    }

    const normalizedUsername = username || email.split("@")[0];
    const existingUser = await User.findOne({
      $or: [{ email }, { username: normalizedUsername }],
    })
      .select("_id")
      .lean()
      .exec();
    if (existingUser) {
      return res.status(409).json({ message: "User already registered" });
    }

    const hasAdmin = await User.exists({ role: { $in: ["admin", "junior_admin", "pending_admin"] } });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      hash_password: passwordHash,
      username: normalizedUsername,
      role: hasAdmin ? "pending_admin" : "admin",
      approved: !hasAdmin,
    }).save();

    const userResponse = user.toObject();
    delete userResponse.hash_password;
    return res.status(hasAdmin ? 202 : 201).json({
      user: userResponse,
      message: hasAdmin
        ? "Signup received. A full admin must approve your account before you can sign in."
        : "First admin account created successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          message: "An account with that email or username already exists",
        });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Signup failed:", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).exec();
    if (!user || !(await bcrypt.compare(password, user.hash_password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role === "pending_admin" || user.approved === false) {
      return res.status(403).json({ message: "Your admin account is waiting for approval" });
    }
    if (!['admin', 'junior_admin'].includes(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Authentication is not configured on the server" });
    }

    const token = jwt.sign(
      { _id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.cookie("auth_token", token, getAuthCookieOptions());

    return res.status(200).json({
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        username: user.username,
        profilePicture: user.profilePicture || "",
        fullName: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (error) {
    console.error("Admin signin failed:", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        username: user.username,
        profilePicture: user.profilePicture || "",
        fullName: `${user.firstName} ${user.lastName}`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    console.error("Profile lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load profile" });
  }
};

const getSafeUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  username: user.username,
  profilePicture: user.profilePicture || "",
  fullName: `${user.firstName} ${user.lastName}`,
});

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).exec();
    if (!user) {
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: "User not found" });
    }

    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;
    if (!req.file && !currentPassword && !newPassword) {
      return res.status(400).json({ message: "Choose a profile photo or enter a new password." });
    }
    if (currentPassword || newPassword) {
      if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Enter your current password and a new password with at least 6 characters." });
      }
      if (!(await bcrypt.compare(currentPassword, user.hash_password))) {
        if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Current password is incorrect." });
      }
      user.hash_password = await bcrypt.hash(newPassword, 12);
    }

    const previousPicture = user.profilePicture;
    if (req.file) {
      user.profilePicture = process.env.API + "/public/" + req.file.filename;
    }
    await user.save();

    if (req.file && previousPicture?.includes("/public/")) {
      const previousFile = path.basename(previousPicture.split("/public/").pop());
      if (previousFile && previousFile !== req.file.filename) {
        await fs.promises.unlink(path.join(uploadsPath, previousFile)).catch(() => {});
      }
    }

    return res.status(200).json({ user: getSafeUser(user), message: "Profile updated successfully." });
  } catch (error) {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    console.error("Profile update failed:", error.message);
    return res.status(500).json({ message: "Could not update profile" });
  }
};

exports.getPendingAdmins = async (req, res) => {
  try {
    const users = await User.find({ role: "pending_admin", approved: false })
      .select("firstName lastName email username createdAt")
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Pending admin lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load pending admin signups" });
  }
};

exports.approveJuniorAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid admin account" });
    }
    const user = await User.findOneAndUpdate(
      { _id: userId, role: "pending_admin", approved: false },
      { $set: { role: "junior_admin", approved: true } },
      { returnDocument: "after", runValidators: true },
    ).exec();
    if (!user) {
      return res.status(404).json({ message: "Pending admin account not found" });
    }
    return res.status(200).json({ user: getSafeUser(user), message: "Junior admin approved successfully." });
  } catch (error) {
    console.error("Admin approval failed:", error.message);
    return res.status(500).json({ message: "Could not approve admin account" });
  }
};
exports.signout = (req, res) => {
  const { maxAge, ...cookieOptions } = getAuthCookieOptions();
  res.clearCookie("auth_token", cookieOptions);
  return res.status(200).json({ message: "Signed out successfully" });
};
