const mongoose = require('mongoose')

const memberSchema = new mongoose.Schema({
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    group_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }

},{timestamps: true})
const Member = mongoose.model('Member',memberSchema);

module.exports = Member