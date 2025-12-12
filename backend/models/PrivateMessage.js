const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const privateMessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);
