
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
    },
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
    },
    hash_password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'junior_admin', 'pending_admin'],
        default: 'user',
    },
    approved: {
        type: Boolean,
        default: true,
    },
    contactNumber: {
        type: String,
    },
    profilePicture: { type: String },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.index({ role: 1, approved: 1, createdAt: 1 });

// userSchema.virtual('password')
 //     .set(function (password) {
    //   this.hash_password = bcrypt.hashSync(password, 10);
    //});

    userSchema.virtual('fullName')
    .get(function () {
        return `${this.firstName} ${this.lastName}`;
    });
    userSchema.methods = {
        authenticate: function(password) {
            return bcrypt.compareSync(password, this.hash_password);
        }
    }
module.exports = mongoose.model('User', userSchema);
