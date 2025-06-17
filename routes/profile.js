const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TestResult = require('../models/TestResult');
const Country = require('../models/Country');
const { ensureAuthenticated } = require('../middleware/auth');


// Защита маршрутов для авторизованных
function isAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
}

router.use(isAuth);

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Получаем последние посещённые страны — предположим, у пользователя есть массив user.visitedCountries с id
    const countries = await Country.find({ _id: { $in: user.stats.lastVisitedCountries || [] } }).limit(10);

    // Получаем результаты тестов с info по тесту
    const results = await TestResult.find({ user: user._id }).populate('test').sort({ date: -1 }).limit(10);

    res.render('profile', {
      user,
      countries,
      results,
      title: 'Профиль пользователя'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});


module.exports = router;
