const User = require('../models/User');

module.exports = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;               // <-- теперь везде доступно req.user
        res.locals.currentUser = user; // <-- и в шаблонах
      }
    } catch (err) {
      console.error('Ошибка attachUser:', err);
    }
  }
  next();
};
