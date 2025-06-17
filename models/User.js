const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'admin' },
  stats: {
    testsPassed: { type: Number, default: 0 },
    correctAnswersPercent: { type: Number, default: 0 },
    lastVisitedCountries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Country' }]
  }
}, {
  timestamps: true // ⬅️ добавит createdAt и updatedAt автоматически
});

module.exports = mongoose.model('User', userSchema);