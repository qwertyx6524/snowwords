// middlewares/ensureAuthenticated.js

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  } else {
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
  }
}

module.exports = { ensureAuthenticated }; 