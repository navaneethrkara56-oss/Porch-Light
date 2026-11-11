/**
 * Chat / Conversation Model for Porch Light Server
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    customId: { type: String },
    senderId: { type: String, required: true },
    senderRole: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, default: '' },
    attachments: [
      {
        id: { type: String },
        name: { type: String },
        size: { type: Number },
        type: { type: String },
        url: { type: String },
      },
    ],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ChatSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    propertyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    messages: [MessageSchema],
    lastMessageAt: { type: Date, default: Date.now, index: true },
    isDevSeed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

ChatSchema.index({ userId: 1, agentId: 1, propertyId: 1 });

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;

