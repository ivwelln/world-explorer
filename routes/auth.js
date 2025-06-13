const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Регистрация - форма
router.get('/register', (req, res) => {
  res.render('register', { title: 'Регистрация', error: null });
});

// Регистрация - обработка
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.render('register', { title: 'Регистрация', error: 'Все поля обязательны' });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.render('register', { title: 'Регистрация', error: 'Пользователь с таким email уже существует' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash });
    await user.save();
    req.session.user = { _id: user._id, name: user.name, role: user.role };
    req.session.userId = user._id; // <-- добавь это

    res.redirect('/');
  } catch (e) {
    res.render('register', { title: 'Регистрация', error: 'Ошибка сервера' });
  }
});

// Вход - форма
router.get('/login', (req, res) => {
  res.render('login', { title: 'Вход', error: null });
});

// Вход - обработка
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { title: 'Вход', error: 'Введите email и пароль' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { title: 'Вход', error: 'Неверный email или пароль' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.render('login', { title: 'Вход', error: 'Неверный email или пароль' });
    }
    req.session.user = { _id: user._id, name: user.name, role: user.role };
    req.session.userId = user._id; // <-- добавь это
    // после проверки пользователя
    if (user.role === 'admin') {
      req.session.isAdmin = true;
}

    res.redirect('/');
  } catch (e) {
    res.render('login', { title: 'Вход', error: 'Ошибка сервера' });
  }
});

// Выход
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});


module.exports = router;
