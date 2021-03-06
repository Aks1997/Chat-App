const mongoose = require('mongoose');

const users = require('./user');

const roomSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: {type: String, required: true},
    password: {type: String, required: true},
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: users
    }]
})

module.exports = mongoose.model('rooms', roomSchema);