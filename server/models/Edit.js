const mongoose = require('mongoose');

const EditSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cloudinaryUrl: {
        type: String,
        required: true
    },
    cloudinaryPublicId: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Edit', EditSchema);
