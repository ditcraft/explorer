var express = require('express');
var router = express.Router();
var passport = require('passport');
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

router.get('/new', function(req, res, next) {
  res.render('newrepo', { user: req.user });
});

router.get('/new/fail', function(req, res, next) {
  res.render('failrepo', { user: req.user });
});

router.get('/new/success', function(req, res, next) {
  res.render('successrepo', { user: req.user, name: req.query.name, provider: req.query.provider, cloneURL: req.query.cloneURL });

  let socket_id = [];
  const io = req.app.get('socketio');

  io.on('connection', socket => {
    console.log('new socket connection');
    socket_id.push(socket.id);
    if (socket_id[0] === socket.id) {
      // remove the connection listener for any subsequent 
      // connections with the same ID
      io.removeAllListeners('connection');
    }

    socket.on('checkRepoInit', name => {
      console.log('triggered checkRepoInit for ', name);
      name = name.replace(/^(https?:|)\/\//, '');
      contr_repositories.checkRepoInit(req.cookies.mode, name, function(hex, name){
        if(hex && name){
          console.log('emitting repoInitialized: ', hex, name);
          socket.emit('repoInitialized', { hex: hex, name: name });
        }
      });
    });
  });
});

router.get('/new/github/:name', function(req, res, next){
  if(req.user && req.user.gitToken){
    contr_repositories.createGithubRepository(req.params.name, req.user.gitToken, function(err, result){
      if(!err){
        res.redirect('/repositories/new/success?provider=GitHub&name=' + req.params.name + '&cloneURL=' + result.data.clone_url);
      } else {
        res.redirect('/repositories/new/fail');
      }
    });
  } else {
    passport.authenticate('github', { scope: ['repo'], state: req.params.name }, function(err, user, info) {
      if (err) return next(err);
      next('route');
    })(req, res, next);
  }
}); 

router.get('/new/gitlab/:name', function(req, res, next){
  if(req.user && req.user.labToken){
    contr_repositories.createGitlabRepository(req.params.name, req.user.labToken, function(err, result){
      if(!err){
        res.redirect('/repositories/new/success?provider=Gitlab&name=' + req.params.name + '&cloneURL=' + result.http_url_to_repo);
      } else {
        res.redirect('/repositories/new/fail');
      }
    });
  } else {
    passport.authenticate('gitlab', { scope: ['api'], state: req.params.name }, function(err, user, info) {
      if (err) return next(err);
      next('route');
    })(req, res, next);
  }
}); 

router.get('/new/bitbucket/:name', function(req, res, next){
  if(req.user && req.user.bucketToken){
    contr_repositories.createBitbucketRepository(req.params.name, req.user.bucketUser, req.user.bucketToken, function(err, result){
      if(!err){
        res.redirect('/repositories/new/success?provider=Bitbucket&name=' + req.params.name + '&cloneURL=' + result.links.clone[0].href);
      } else {
        res.redirect('/repositories/new/fail');
      }
    });
  } else {
    passport.authenticate('bitbucket', { state: req.params.name }, function(err, user, info) {
      if (err) return next(err);
      next('route');
    })(req, res, next);
  }
}); 

router.get('/:repository', function(req, res, next){
  contr_repositories.getRepositories(req.cookies.mode, req.params.repository, true, function(repository){
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