const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    answers: [{
        question: String,
        selected: String,
        correct: String
    }],
    score: Number,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestResult', TestResultSchema);
