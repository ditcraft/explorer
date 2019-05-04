var express = require('express');
var router = express.Router();
var passport = require('passport');
var contr_address = require('../controllers/contr_address');

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
    contr_address.getAddressByTwitterID(req.user.id, function(err, result){
      if(result.eth_address){
        res.redirect('/address/' + result.eth_address);
      } else {
        res.redirect('/login/twitter/kyc');
      }
    });
});

router.get('/twitter/kyc', function(req, res, next) {
  res.render('twitter-kyc');
});

module.exports = router;