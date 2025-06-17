const express = require('express');
const router = express.Router();
const Country = require('../models/Country');
const User = require('../models/User');


router.get('/', async (req, res) => {
  const country = await Country.findById(req.params.id);
  const searchQuery = req.query.search ? req.query.search.trim() : '';
  const selectedContinent = req.query.continent || '';
  const user = req.session.user || null;

  // Получаем все страны
  let countries = await Country.find();

  // Фильтрация по континенту
  if (selectedContinent) {
    countries = countries.filter(c => c.geography?.continent === selectedContinent);
  }

  // Фильтрация по строке поиска
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    countries = countries.filter(c =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.capital && c.capital.toLowerCase().includes(query))
    );
  }

  // Получаем список континентов
  const continents = await Country.distinct('geography.continent');

  // Группировка стран по континентам
  let groupedCountries = {};
  if (!searchQuery) {
    for (const country of countries) {
      const continent = country.geography?.continent || 'Неизвестно';
      if (!groupedCountries[continent]) {
        groupedCountries[continent] = [];
      }
      groupedCountries[continent].push(country);
    }
  }

  res.render('dictionary', {
    title: 'Словарь стран',
    searchQuery,
    selectedContinent,
    continents: continents.sort(),
    groupedCountries,
    flatCountries: countries,
    user,
    country
  });
});

// Страница одной страны
router.get('/:id', async (req, res) => {
  const user = req.session.user || null;
  try {
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).send('Страна не найдена');

    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        if (!user.stats) user.stats = {};
        if (!user.stats.lastVisitedCountries) user.stats.lastVisitedCountries = [];

        const countryIdStr = country._id.toString();

        user.stats.lastVisitedCountries = user.stats.lastVisitedCountries.filter(
          id => id.toString() !== countryIdStr
        );

        user.stats.lastVisitedCountries.unshift(country._id);
        user.stats.lastVisitedCountries = user.stats.lastVisitedCountries.slice(0, 4);

        await user.save();
      }
    }

    res.render('country', { title: country.name, country });
  } catch (e) {
    console.error('Ошибка в маршруте /:id:', e);
    res.status(500).send('Ошибка сервера');
  }
});

// Пример на Express-контроллер
exports.listCountries = async (req, res) => {
    const search = req.query.search || '';
    const continentFilter = req.query.continent || '';

    let query = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { capital: { $regex: search, $options: 'i' } }
        ];
    }

    if (continentFilter) {
        query.continent = continentFilter;
    }

    const countries = await Country.find(query).sort({ name: 1 }).lean();

    // Группировка по континентам
    const grouped = {};
    countries.forEach(c => {
        if (!grouped[c.continent]) grouped[c.continent] = [];
        grouped[c.continent].push(c);
    });

    // Список всех континентов для фильтра
    const continents = await Country.distinct('continent');

    res.render('countries/index', {
        groupedCountries: grouped,
        continents,
        selectedContinent: continentFilter,
        search,
        user: req.session.user // если используешь сессии
    });
};

module.exports = router;
