var express = require('express');
var router = express.Router();
var contr_repositories = require('../controllers/contr_repositories'); 

/* GET home page. */
router.get('/', function(req, res, next) {
  contr_repositories.getAllRepositories(function(repositories){
    //res.send(repositories);
    res.render('repositories', { user: req.user, repositories: repositories });
  });
});
router.get('/data', function(req, res, next) {
  contr_repositories.getAllRepositories(function(repositories){
    res.send(repositories);
    //res.render('repositories', { user: req.user, repositories: repositories });
  });
});

module.exports = router;