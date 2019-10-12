var express = require('express');
var router = express.Router();
var passport = require('passport');
var contr_address = require('../controllers/contr_address');
var contr_repositories = require('../controllers/contr_repositories');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback', passport.authenticate('twitter', {
  failureRedirect : '/login/twitter/kyc'
}), 
  function(req, res){
    contr_address.getAddressByTwitterID(req.cookies.mode, req.user.id, function(err, result){
      if(result && result.address){
        //res.redirect('/address/' + result.address);
        res.redirect('/start');
      } else {
        req.logout();
        res.redirect('/login/twitter/kyc');
      }
    });
});

router.get('/github', passport.authenticate('github'));

router.get('/github/callback', passport.authenticate('github', {
  failureRedirect : '/repositories/new/fail'
}), 
  function(req, res){
    var id = req.user.id;
    if(req.query.state){
      contr_repositories.createGithubRepository(req.query.state, req.user.gitToken, function(err, result){
        if(!err){
          res.redirect('/repositories/new/success?provider=GitHub&name=' + req.query.state + '&cloneURL=' + result.data.clone_url);
        } else {
          res.redirect('/repositories/new/fail');
        }
      })
    } else {
      contr_address.getAddressByGitHubID(req.cookies.mode, id, function(error, result){
        if(result && result.address){
          //res.redirect('/address/' + result.address);
          res.redirect('/start');
        } else {
          res.redirect('/login/github/kyc?id=' + id);
        }
      });
    }
});

router.get('/gitlab/callback', passport.authenticate('gitlab', {
  failureRedirect : '/repositories/new/fail'
}), 
  function(req, res){
    contr_repositories.createGitlabRepository(req.query.state, req.user.labToken, function(err, result){
      if(!err){
        res.redirect('/repositories/new/success?provider=Gitlab&name=' + req.query.state + '&cloneURL=' + result.http_url_to_repo);
      } else {
        res.redirect('/repositories/new/fail');
      }
    });
});

router.get('/bitbucket/callback', passport.authenticate('bitbucket', {
  failureRedirect : '/repositories/new/fail'
}), 
  function(req, res){
    contr_repositories.createBitbucketRepository(req.query.state, req.user.bucketUser, req.user.bucketToken, function(err, result){
      if(!err){
        res.redirect('/repositories/new/success?provider=Bitbucket&name=' + req.query.state + '&cloneURL=' + result.links.clone[0].href);
      } else {
        res.redirect('/repositories/new/fail');
      }
    });
});

router.get('/twitter/kyc', function(req, res, next) {
  res.render('twitter-kyc');
});

router.get('/github/kyc', function(req, res, next) {
  res.render('github-kyc', { user: req.user });
});

router.post('/github/kyc/connect', function(req, res, next) {
  req.user.eth_address = req.body.address;
  contr_address.connectGitHub(req.cookies.mode, req.body.id, req.body.address, function(connected, address){
    res.send({connected, address});
  });
});

module.exports = router;