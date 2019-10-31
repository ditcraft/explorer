var express = require('express');
var router = express.Router();
var contr_settings = require('../controllers/contr_settings'); 

/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.user && req.user.eth_address){
    contr_settings.getUserData(req.user.eth_address, function(error, result){
      if(!error){
        res.render('settings', { user: req.user, data: result });
      }
    });
  } else {
    res.render('error-404');
  }
});

router.post('/setMain', function(req, res, next){
  contr_settings.setMainAccount(req.user.eth_address, req.body.provider, function(success){
    res.send(success);
  });
});

module.exports = router;