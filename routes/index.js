const express = require('express');
const router = express.Router();

const Test = require('../models/Test'); // импорт модели тестов (пример)
const Country = require('../models/Country'); // импорт модели стран

router.get('/', async (req, res) => {
  try {
    const randomTest = await Test.aggregate([{ $sample: { size: 1 } }]);
    const countries = await Country.find({}).limit(6);

    res.render('index', {
      heroImage: '/images/nice-view.jpg',
      randomTest: randomTest[0],
      countries,
      title: 'Страны мира'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки главной страницы');
  }
});

module.exports = router;