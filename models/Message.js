const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    message:{
        type: String
    },
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    group_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }

},{timestamps: true})
const Message = mongoose.model('Message',messageSchema);

module.exports = Message