var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/welcome', function(req, res, next) {
  res.render('index', { user: req.user });
});

router.get('/', function(req, res, next) {
  if(req.user){
    res.render('index', { user: req.user });
  } else {
    res.render('login');
  }
});

module.exports = router;
