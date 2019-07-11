var express = require('express');
var router = express.Router();
var passport = require('passport');
var contr_address = require('../controllers/contr_address');
var contr_repositories = require('../controllers/contr_repositories');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

/** Add twitter login and return methoods */
router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback', passport.authenticate('twitter', {
  failureRedirect : '/login/twitter/kyc'
}), 
  function(req, res){
    contr_address.getAddressByTwitterID(req.user.id, function(err, result){
      if(result && result.eth_address){
        res.redirect('/address/' + result.eth_address);
      } else {
        req.logout();
        res.redirect('/login/twitter/kyc');
      }
    });
});

router.get('/github/callback', passport.authenticate('github', {
  failureRedirect : '/repositories/new/fail'
}), 
  function(req, res){
    contr_repositories.createGithubRepository(req.query.state, req.user.gitToken, function(err, result){
      if(!err){
        res.redirect('/repositories/new/success?provider=GitHub&name=' + req.query.state + '&cloneURL=' + result.data.clone_url);
      } else {
        res.redirect('/repositories/new/fail');
      }
    });
});

router.get('/twitter/kyc', function(req, res, next) {
  res.render('twitter-kyc');
});

module.exports = router;