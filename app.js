const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const MongoStore = require('connect-mongo');
const attachUser = require('./middleware/attachUser');

const app = express();
const expressLayouts = require('express-ejs-layouts'); // <- добавьте это

app.use(expressLayouts); // <- обязательно до app.set('view engine', ...)
app.set('layout', 'layout'); // <- имя файла шаблона по умолчанию, без .ejs


// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/worldcountries', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Сессии
app.use(session({
  secret: 'secret_key_12345',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/worldcountries' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Парсинг тела запросов
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Статика
app.use(express.static(path.join(__dirname, 'public')));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Пользователь в шаблоны
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});
app.use(attachUser);

// Роуты
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const countriesRoutes = require('./routes/countries');
const testsRoutes = require('./routes/tests');
const profileRoutes = require('./routes/profile');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/countries', countriesRoutes);
app.use('/tests', testsRoutes);
app.use('/profile', profileRoutes);
app.use('/api', require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Страница не найдена' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
