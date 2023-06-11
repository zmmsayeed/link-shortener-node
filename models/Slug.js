const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const slugSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuid(),
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
}, { timestamps: true });

const Slug = mongoose.model('Slug', slugSchema);
module.exports = Slug;
