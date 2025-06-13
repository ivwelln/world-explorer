const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');


// Список тестов
router.get('/', async (req, res) => {
  try {
    console.log('isAdmin:', req.session.isAdmin);

    const tests = await Test.find();

    const userId = req.session.userId;

    let resultsMap = {};
    if (userId) {
  const results = await TestResult.find({ user: userId });
  results.forEach(r => {
    const test = tests.find(t => t._id.toString() === r.test.toString());
    if (test) {
      const totalQuestions = test.questions.length;
      // вычисляем процент правильных ответов
      const percentScore = Math.round((r.score / totalQuestions) * 100);
      resultsMap[r.test.toString()] = {
        ...r.toObject(),
        percentScore // добавляем поле с процентом
      };
    }
  });
}

    res.render('tests/list', {
      tests,
      resultsMap,
      isAdmin: req.session.isAdmin || false,
      title: "Список тестов"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Пройти тест - форма
router.get('/start/:id', ensureAuthenticated, async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).send('Тест не найден');

  // Формируем вопросы с вариантами ответов
  const questions = test.questions.map(q => {
    let options = [q.correctAnswer];
    if (Array.isArray(q.wrongAnswers)) {
      options = options.concat(q.wrongAnswers);
    }
    options = options.sort(() => Math.random() - 0.5);

    return {
      question: q.question,  // Важно — передаем поле question (не countryName)
      correctAnswer: q.correctAnswer,
      options
    };
  });

  res.render('tests/start', {
    test,
    questions,
    title: test.title
  });
});

router.post('/submit/:id', ensureAuthenticated, async (req, res) => {
    const { answers, score } = req.body;
    const userId = req.session.userId; // <--- здесь исправлено
    const testId = req.params.id;
    console.log('req.body:', req.body);
    console.log('userId:', userId);
    console.log('testId:', testId);


    try {
        const test = await Test.findById(testId);
        const user = await User.findById(userId);

        if (!test || !user) {
            return res.status(404).send('Тест или пользователь не найден');
        }

        let correctCount = 0;
        const formattedAnswers = answers.map(ans => {
            const isCorrect = ans.selected === ans.correct;
            if (isCorrect) correctCount++;
            return {
                question: ans.question,
                selected: ans.selected,
                correct: ans.correct
            };
        });

        await TestResult.create({
            user: userId,
            test: testId,
            answers: formattedAnswers,
            score: correctCount,
        });

        const previousPassed = user.stats.testsPassed || 0;
        const previousAvg = user.stats.correctAnswersPercent || 0;

        const newPassed = previousPassed + 1;
        const currentPercent = Math.round((correctCount / answers.length) * 100);
        const newAvg = Math.round(((previousAvg * previousPassed) + currentPercent) / newPassed);

        user.stats.testsPassed = newPassed;
        user.stats.correctAnswersPercent = newAvg;

        await user.save();

        res.redirect('/tests');
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка при сохранении результатов');
    }
});




router.get('/result-temp', (req, res) => {
    res.render('tests/result-temp', { score: req.query.score });
});


module.exports = router;
