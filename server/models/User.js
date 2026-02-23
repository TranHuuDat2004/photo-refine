const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot be more than 30 characters long']
    },
    password: {
        type: String,
        required: function () {
            // Password is only required if they are NOT signing in via Google
            return !this.googleId;
        },
        minlength: [6, 'Password must be at least 6 characters long']
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null/undefined values
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    profilePicture: {
        type: String
    }
}, { timestamps: true });

// Hash password before saving to database
UserSchema.pre('save', async function () {
    // Only hash if password exists and is modified
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to check generated hash password against provided password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
