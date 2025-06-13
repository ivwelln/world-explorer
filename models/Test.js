const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  wrongAnswers: [{ type: String }] // Можно оставить пустыми, если будут браться из пула
});

const TestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [QuestionSchema],
  timeLimitSeconds: { type: Number, default: 0 },
  answersPool: [String] // массив строк - общий пул ответов
});

module.exports = mongoose.model('Test', TestSchema);
