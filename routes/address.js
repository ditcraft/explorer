var express = require('express');
var router = express.Router();
var Web3 = require('web3');
var config = require('../config');
var contr_address = require('../controllers/contr_address'); 
var contr_proposals = require('../controllers/contr_proposals'); 
var contr_repositories = require('../controllers/contr_repositories'); 

router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/check', function(req, res){
  contr_address.checkIfValidAddress(req.cookies.mode, req, function(isValid){
    res.send(isValid);
  });
});

router.get('/:address', function(req, res, next){
  contr_address.getAddress(req.cookies.mode, req.params.address, function(error, result){
    if(!error){
      result.user = req.user;
      res.render('address', { user: req.user, address: result[0], proposals: result[0].proposals});
    } else {
      console.log('error: ', error);
      res.render('error-404');
    }
  });
});

router.get('/:address/twitterName', function(req, res, next){
  var userAddr = req.params.address;
  contr_address.getTwitterName(userAddr).then(function(result){
    res.send(result);
  });
});

router.get('/:address/proposals', function(req, res, next){
  contr_proposals.getProposals(req.cookies.mode, req.params.address, null).then(function(result){
    res.send(result);
  });
});

router.get('/:address/repositories', function(req, res, next){
  contr_repositories.getAssociatedRepositories(req.cookies.mode, req.params.address, function(result){
    res.send(result);
  });
});

module.exports = router;