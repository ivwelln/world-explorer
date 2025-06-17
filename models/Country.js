const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  title: String,
  content: String
});

const historyItemSchema = new mongoose.Schema({
  year: Number,
  value: Number
});

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  capital: String,
  flagPath: String, // Путь к файлу флага на сервере
  imagePaths: [String], // Пути к изображениям

  sections: [sectionSchema],

  geography: {
    continent: String,
    seasOceansCount: String,
    riversCount: String,
    lakesCount: String,
    area: String, // км²
    latitude: Number,  // Широта
    longitude: Number  // Долгота
  },

  economy: {
    gdp: String,
    gdpPerCapita: String,
    inflation: Number,
    unemployment: Number,
    avgSalary: String,
    gdpHistory: [historyItemSchema]
  },

  demographics: {
    population: String,
    populationDensity: String,
    lifeExpectancy: String,
    populationHistory: [historyItemSchema]
  },

});

module.exports = mongoose.model('Country', countrySchema);