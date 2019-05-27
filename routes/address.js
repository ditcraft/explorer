var express = require('express');
var router = express.Router();
var Web3 = require('web3');
var config = require('../config');
var contr_address = require('../controllers/contr_address'); 
var contr_proposals = require('../controllers/contr_proposals'); 

router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/check', function(req, res){
  contr_address.checkIfValidAddress(req, function(isValid){
    res.send(isValid);
  });
});

router.get('/:address', function(req, res, next){
  var userAddr = req.params.address;
  contr_address.getAddress(userAddr, function(error, result){
    if(!error){
      result.user = req.user;
      res.render('address', result);
    } else {
      console.log('error: ', error);
      res.render('error-404');
    }
  });
});

router.get('/:address/twitterName', function(req, res, next){
  var userAddr = req.params.address;
  contr_address.getTwitterName(userAddr, function(error, result){
    res.send(result);
  });
});

router.get('/:address/proposals', function(req, res, next){
  contr_proposals.getProposals(req.params.address, null).then(function(result){
    res.send(result);
  });
});

module.exports = router;