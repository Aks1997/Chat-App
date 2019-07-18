const mongoose = require('mongoose');

const room = require('./room');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    id: {type: String, required: true},
    name: {type: String, required: true},
    room: {type: mongoose.Schema.Types.ObjectId, ref: room}
})

module.exports = mongoose.model('users', userSchema);