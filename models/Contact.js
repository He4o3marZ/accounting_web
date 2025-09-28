const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    company: {
        type: String
    },
    phone: {
        type: String
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'converted', 'closed'],
        default: 'new'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contact', contactSchema);

