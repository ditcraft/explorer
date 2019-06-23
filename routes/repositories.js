var express = require('express');
var router = express.Router();
var contr_repositories = require('../controllers/contr_repositories'); 

/* GET home page. */
router.get('/', function(req, res, next) {
  contr_repositories.getRepositories(req.cookies.mode, null, false, function(repositories){
    //res.send(repositories);
    res.render('repositories', { user: req.user, repositories: repositories });
  });
});
router.get('/data', function(req, res, next) {
  contr_repositories.getRepositories(req.cookies.mode, null, false, function(repositories){
    res.send(repositories);
    //res.render('repositories', { user: req.user, repositories: repositories });
  });
});
router.get('/:repository', function(req, res, next){
  contr_repositories.getRepositories(req.cookies.mode, req.params.repository, true, function(repository){
    //res.send(repository);
    console.log(repository[0]);
    if(repository[0] && repository[0].proposals){
      var proposals = repository[0].proposals;
      delete repository[0].proposals;
      res.render('repository', { user: req.user, repository: repository[0], proposals: proposals});
    } else {
      res.render('error-404');
    }
  });
});

module.exports = router;