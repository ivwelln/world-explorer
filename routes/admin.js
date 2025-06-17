const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Country = require('../models/Country');
const Test = require('../models/Test');
const User = require('../models/User');
const TestResult = require('../models/TestResult');
const { requireAdmin } = require('../middleware/auth'); // middleware для проверки прав
const { ensureAuthenticated } = require('../middleware/auth'); // middleware для проверки прав

const fs = require('fs');

// Middleware для защиты маршрутов только для админов
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Доступ запрещен');
  }
}

router.use(isAdmin);

// Конфигурация multer для загрузки флага и изображений

// Папка для загрузок (создай, если нет)
const uploadDir = path.join(__dirname, 'public/uploads/countries');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранения файлов с уникальными именами
const uploadPath = path.resolve(__dirname, '../public/uploads/countries');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Панель администратора (статистика)
router.get('/', async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      tests: await Test.countDocuments(),
      countries: await Country.countDocuments(),
      completedTests: await TestResult.countDocuments()
    };

    res.render('admin/dashboard', { title: 'Панель администратора', stats });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Страница создания новой страны
router.get('/countries/create', async (req, res) => {
  res.render('admin/countries_form', {
    title: 'Создать страну',
    country: null,
    existingImages: []
  });
});

// Страница редактирования страны
router.get('/countries/:id/edit', async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).send('Страна не найдена');

    res.render('admin/countries_form', {
      title: 'Редактировать страну',
      country,
      edit: true,
      existingImages: country.imagePaths || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Обработка создания новой страны
router.post('/countries/create', upload.fields([
  { name: 'flag', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    const body = req.body;
    console.log('FILES:', req.files); // Тест

    // Обработка загрузок
    const flagFile = req.files['flag'] ? req.files['flag'][0].filename : null;
    const imagesFiles = req.files['images'] ? req.files['images'].map(f => f.filename) : [];

    // Парсим JSON поля
    const sections = body.sections ? JSON.parse(body.sections) : [];
    const customFields = body.customFields ? JSON.parse(body.customFields) : {};

    let gdpHistory = [];
    let populationHistory = [];

    try { gdpHistory = JSON.parse(body.gdpHistory); } catch {}
    try { populationHistory = JSON.parse(body.populationHistory); } catch {}

    const country = new Country({
      name: body.name,
      capital: body.capital,
      flagPath: flagFile ? '/uploads/countries/' + flagFile : '',
      imagePaths: imagesFiles.map(f => '/uploads/countries/' + f),
      geography: {
        latitude: parseFloat(body.latitude) || null,
        longitude: parseFloat(body.longitude) || null,
        continent: body.continent || '',
        seasOceansCount: body.seasOceansCount || 0,
        riversCount: body.riversCount || 0,
        lakesCount: body.lakesCount || 0,
        area: body.area || 0,
      },
      economy: {
        gdp: body.gdp || 0,
        gdpPerCapita: body.gdpPerCapita || 0,
        inflation: parseFloat(body.inflation) || 0,
        unemployment: parseFloat(body.unemployment) || 0,
        avgSalary: body.avgSalary || 0,
        gdpHistory,
      },
      demographics: {
        population: body.population || 0,
        populationDensity: body.populationDensity || 0,
        lifeExpectancy: body.lifeExpectancy || 0,
        populationHistory,
      },
      sections,
      customFields
    });

    // Обработка удаления изображений
    const deletedImages = JSON.parse(body.deletedImages || '[]');
    for (const imgPath of deletedImages) {
      const filename = path.basename(imgPath);
      const fullPath = path.join(__dirname, '../public/uploads/countries/', filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    // Удаляем из массива изображения, которые удалили на клиенте
    country.imagePaths = country.imagePaths.filter(img => !deletedImages.includes(img));

    await country.save();

    res.redirect('/countries');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка создания страны');
  }
});

// Обработка обновления страны
router.post('/countries/:id/edit', upload.fields([
  { name: 'flag', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;

    const country = await Country.findById(id);
    if (!country) return res.status(404).send('Страна не найдена');

    // Обновляем флаг
    if (req.files['flag'] && req.files['flag'][0]) {
      country.flagPath = '/uploads/countries/' + req.files['flag'][0].filename;
    } else if (body.oldFlagPath) {
      country.flagPath = body.oldFlagPath;
    } else {
      country.flagPath = '';
    }

    // Обновляем изображения
    let newImages = [];
    if (req.files['images'] && req.files['images'].length) {
      newImages = req.files['images'].map(f => '/uploads/countries/' + f.filename);
    }
    if (newImages.length) {
      country.imagePaths = newImages;
    } else if (body.oldImagePaths) {
      try {
        country.imagePaths = JSON.parse(body.oldImagePaths);
      } catch {
        country.imagePaths = [];
      }
    } else {
      country.imagePaths = [];
    }

    // Парсим JSON поля
    const sections = body.sections ? JSON.parse(body.sections) : [];
    const customFields = body.customFields ? JSON.parse(body.customFields) : {};

    let gdpHistory = [];
    let populationHistory = [];
    try { gdpHistory = JSON.parse(body.gdpHistory); } catch {}
    try { populationHistory = JSON.parse(body.populationHistory); } catch {}

    // Обновляем остальные данные
    country.name = body.name;
    country.capital = body.capital;
    country.geography = {
      latitude: parseFloat(body.latitude) || null,
      longitude: parseFloat(body.longitude) || null,
      continent: body.continent || '',
      seasOceansCount: body.seasOceansCount || 0,
      riversCount: body.riversCount || 0,
      lakesCount: body.lakesCount || 0,
      area: body.area || 0,
    };
    country.economy = {
      gdp: body.gdp || 0,
      gdpPerCapita: body.gdpPerCapita || 0,
      inflation: parseFloat(body.inflation) || 0,
      unemployment: parseFloat(body.unemployment) || 0,
      avgSalary: body.avgSalary || 0,
      gdpHistory,
    };
    country.demographics = {
      population: body.population || 0,
      populationDensity: body.populationDensity || 0,
      lifeExpectancy: body.lifeExpectancy || 0,
      populationHistory,
    };
    country.sections = sections;
    country.customFields = customFields;

    // Удаление удалённых изображений
    const deletedImages = JSON.parse(body.deletedImages || '[]');
    for (const imgPath of deletedImages) {
      const filename = path.basename(imgPath);
      const fullPath = path.join(__dirname, '../public/uploads/countries/', filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    // Обновляем массив изображений после удаления
    country.imagePaths = country.imagePaths.filter(img => !deletedImages.includes(img));

    await country.save();

    res.redirect('/admin/countries');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка обновления страны');
  }
});

router.post('/countries/delete/:id', requireAdmin, async (req, res) => {
  try {
    await Country.findByIdAndDelete(req.params.id);
    res.redirect('/countries');
  } catch (err) {
    console.error('Ошибка при удалении страны:', err);
    res.status(500).send('Ошибка сервера при удалении страны.');
  }
});

// Тесты
// Форма создания нового теста
router.get('/tests/new', async (req, res) => {
  try {
    // Пример: стартовый пул ответов (можно заменить на загрузку из БД)
    const answersPool = [];

    res.render('admin/tests_form', {
      formAction: '/admin/tests/create',
      test: null,
      title: 'Создание теста',
      answersPool
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Ошибка загрузки формы');
  }
});


  router.get('/tests/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).send('Неверный ID теста');
      }
      const test = await Test.findById(req.params.id);
      if (!test) return res.status(404).send('Тест не найден');
  
      // Извлечь пул ответов из теста, если он там есть, или из общей коллекции
      const answersPool = test.answersPool || [];
  
      res.render('admin/tests_form', {
        formAction: `/admin/tests/${req.params.id}/edit`,
        test,
        title: 'Редактирование теста',
        answersPool
      });
    } catch (e) {
      console.error(e);
      res.status(500).send('Ошибка загрузки формы');
    }
  });

// Создание теста
router.post('/tests/create', async (req, res) => {
    try {
      const data = req.body;
      const questions = data.questions ? JSON.parse(data.questions) : [];
      const answersPool = data.answersPool ? JSON.parse(data.answersPool) : [];
  
      const timeLimitSeconds = parseInt(data.timeLimitSeconds, 10);
      const testData = {
        title: data.title,
        questions,
        timeLimitSeconds: Number.isNaN(timeLimitSeconds) ? 0 : timeLimitSeconds,
        answersPool
      };
  
      const test = new Test(testData);
      await test.save();
      res.redirect('/admin');
    } catch (e) {
      console.error(e);
      res.status(500).send('Ошибка при сохранении теста');
    }
  });

  // Получение всех вопросов из пула
router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при загрузке вопросов' });
  }
});

module.exports = router;

// Редактирование теста
router.post('/tests/:id/edit', async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).send('Неверный ID теста');
      }
      const data = req.body;
      const questions = data.questions ? JSON.parse(data.questions) : [];
      const answersPool = data.answersPool ? JSON.parse(data.answersPool) : [];
  
      const timeLimitSeconds = Number(data.timeLimitSeconds);
      const testData = {
        title: data.title,
        questions,
        timeLimitSeconds: isNaN(timeLimitSeconds) ? 0 : timeLimitSeconds,
        answersPool
      };
  
      await Test.findByIdAndUpdate(req.params.id, testData);
      res.redirect('/admin');
    } catch (e) {
      console.error(e);
      res.status(500).send('Ошибка при обновлении теста');
    }
  });


// Удаление теста
router.post('/tests/:id/delete', async (req, res) => {
    await Test.findByIdAndDelete(req.params.id);
    res.redirect('/tests');
});

// controllers/admin.js или routes/admin.js
router.get('/users', async (req, res) => {
  const query = req.query.q || '';
  const regex = new RegExp(query, 'i'); // для нечувствительного поиска

  const users = await User.find({
    $or: [
      { username: regex },
      { email: regex }
    ]
  }).sort({ createdAt: -1 });

  res.render('admin/admin_users', { users, query, title: "Список пользователей" });
});

router.post('/users/promote/:id', async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { role: 'admin' });
  res.redirect('/admin/users');
});

router.post('/users/demote/:id', async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { role: 'user' });
  res.redirect('/admin/users');
});

router.post('/users/reset/:id', async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { testHistory: [] });
  res.redirect('/admin/users');
});


// Назначение роли пользователю
router.post('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).send('Неверная роль');

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send('Неверный ID пользователя');
  }

  await User.findByIdAndUpdate(req.params.id, { role });
  res.redirect('/admin');
});

module.exports = router;
