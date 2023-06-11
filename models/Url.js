const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const urlSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuid(),
    },
    slug: {
        type: String, 
        unique: true 
    },
    longUrl: String,
    visitCount: { 
        type: Number, 
        default: 0 
    },
    visitorDetails: [{
        _id: {
            type: String,
            default: uuid(),
        },
        location: String,
        device: String,
        timestamp: { 
            type: Date, 
            default: Date.now 
        },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Url', urlSchema);