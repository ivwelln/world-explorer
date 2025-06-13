const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  title: String,
  content: String
});

const historyItemSchema = new mongoose.Schema({
  year: Number,
  value: Number
});

const customFieldSchema = new mongoose.Schema({
  key: String,
  value: String
});

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  capital: String,
  flagPath: String, // Путь к файлу флага на сервере
  imagePaths: [String], // Пути к изображениям

  sections: [sectionSchema],

  geography: {
    continent: String,
    seasOceansCount: Number,
    riversCount: Number,
    lakesCount: Number,
    area: Number, // км²
    latitude: Number,  // Широта
    longitude: Number  // Долгота
  },

  economy: {
    gdp: Number,
    gdpPerCapita: Number,
    inflation: Number,
    unemployment: Number,
    avgSalary: Number,
    gdpHistory: [historyItemSchema]
  },

  demographics: {
    population: Number,
    populationDensity: Number,
    lifeExpectancy: Number,
    populationHistory: [historyItemSchema]
  },

  customFields: [customFieldSchema] // Дополнительные произвольные поля
});

module.exports = mongoose.model('Country', countrySchema);