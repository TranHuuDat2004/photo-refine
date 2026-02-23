const mongoose = require('mongoose');

const EditSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    githubUrl: {
        type: String,
        required: true
    },
    githubSha: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Edit', EditSchema);
