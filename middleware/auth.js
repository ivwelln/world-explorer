function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        req.user = req.session.user; // 🔧 добавьте эту строку
        return next();
    }
    req.flash('error_msg', 'Пожалуйста, войдите в аккаунт');
    res.redirect('/auth/login');
};

function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Доступ запрещён');
  }
}

module.exports = { requireAdmin, ensureAuthenticated };
