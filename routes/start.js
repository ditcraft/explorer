var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.user && req.user.eth_address){
    res.render('start', { user: req.user });
  } else {
    res.render('error-404');
  }
});

module.exports = router;
