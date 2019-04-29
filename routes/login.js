var express = require('express');
var router = express.Router();
var passport = require('passport');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

/** Add twitter login and return methoods */
router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback', passport.authenticate('twitter', {
  failureRedirect : '/login'
}), 
  function(req, res){
    console.log(req.user);
    res.redirect('/');
});

module.exports = router;