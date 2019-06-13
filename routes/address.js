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
  contr_address.checkIfValidAddress(req, function(isValid){
    res.send(isValid);
  });
});

router.get('/:address', function(req, res, next){
  contr_proposals.getProposals(req.params.address, null).then((proposals) => {                        
    contr_repositories.getAssociatedRepositories(req.params.address, function(repositories){
      contr_address.getAddress(req.params.address, function(error, result){
        if(!error){
          result.user = req.user;
          result.repositories = repositories;
          result.proposals = proposals;
          res.render('address', result);
          console.log('address: ', result);
        } else {
          console.log('error: ', error);
          res.render('error-404');
        }
      });
    });
  }).catch(e => {
      callback(e);
  });
});

router.get('/:address/twitterName', function(req, res, next){
  var userAddr = req.params.address;
  contr_address.getTwitterName(userAddr).then(function(result){
    res.send(result);
  });
});

router.get('/:address/proposals', function(req, res, next){
  contr_proposals.getProposals(req.params.address, null).then(function(result){
    res.send(result);
  });
});

router.get('/:address/repositories', function(req, res, next){
  contr_repositories.getAssociatedRepositories(req.params.address, function(result){
    res.send(result);
  });
});

module.exports = router;