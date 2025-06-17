const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const MongoStore = require('connect-mongo');
const attachUser = require('./middleware/attachUser');

const app = express();
const expressLayouts = require('express-ejs-layouts'); 

app.use(expressLayouts); 
app.set('layout', 'layout');

mongoose.connect('mongodb://localhost:27017/worldcountries', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(session({
  secret: 'secret_key_12345',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/worldcountries' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(flash());

// Передаём flash-сообщения во все шаблоны
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});
app.use(attachUser);

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

app.use((req, res) => {
  res.status(404).render('404', { title: 'Страница не найдена' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
