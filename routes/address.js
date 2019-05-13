var express = require('express');
var router = express.Router();
var Web3 = require('web3');
var contractAddr = "0x6081aa30758e9D752fd7d8E7729220A80771e835"; 
var contr_address = require('../controllers/contr_address'); 

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
  web3 = new Web3(new Web3.providers.HttpProvider('https://dai.poa.network'));
  var abi = [{"constant":true,"inputs":[{"name":"_address","type":"address"},{"name":"_label","type":"string"}],"name":"freeBalanceOfLabel","outputs":[{"name":"freeBalance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_contractAddress","type":"address"}],"name":"addVotingContract","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_address","type":"address"},{"name":"_labelID","type":"uint256"}],"name":"labelOfAddress","outputs":[{"name":"label","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_address","type":"address"},{"name":"_label","type":"string"},{"name":"_amount","type":"uint256"}],"name":"lockTokens","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_address","type":"address"},{"name":"_label","type":"string"}],"name":"balanceOfLabel","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_address","type":"address"},{"name":"_label","type":"string"},{"name":"_amount","type":"uint256"}],"name":"mint","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_label","type":"string"}],"name":"totalLabelSupply","outputs":[{"name":"totalSupplyOfLabel","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_address","type":"address"},{"name":"_label","type":"string"},{"name":"_amount","type":"uint256"}],"name":"burn","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_address","type":"address"},{"name":"_label","type":"string"},{"name":"_numberOfTokens","type":"uint256"}],"name":"unlockTokens","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_address","type":"address"}],"name":"labelCountOfAddress","outputs":[{"name":"labelCount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"votingContracts","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":false,"name":"label","type":"string"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":false,"name":"label","type":"string"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Burn","type":"event"}];
  var ditContract = new web3.eth.Contract(abi, contractAddr);

  var obj;
  var label = "";
  var balance = "";
  contr_address.getProposalsByAddress(userAddr, proposals => {
    ditContract.methods.labelCountOfAddress(userAddr).call().then(async function(labelCount, error){
      for(var i = 1; i <= parseInt(labelCount); i++){
        obj = {};
        await ditContract.methods.labelOfAddress(userAddr, i).call().then(async function(labelString){
          label = labelString;
           await ditContract.methods.balanceOfLabel(userAddr, labelString).call().then(function(labelBalance){
             balance = web3.utils.toBN(labelBalance).toString();
             obj[label] = web3.utils.fromWei(balance, 'ether')
           });
         });
       }
      res.render('address', { user: req.user, address: userAddr, balance: obj, total: sum(obj).toFixed(2), proposals: proposals });
    }).catch(e => {
      res.render('error-404');
    });
  })
});

router.get('/:address/twitterName', function(req, res, next){
  var userAddr = req.params.address;
  contr_address.getTwitterName(userAddr, function(error, result){
    res.send(result);
  });
});

router.get('/:address/proposals', function(req, res, next){
  var userAddr = req.params.address;
  contr_address.getProposalsByAddress(userAddr, function(result){
    res.send(result);
  });
});

function sum(obj) {
  var sum = 0;
  for(var el in obj) {
    if(obj.hasOwnProperty(el) ) {
      sum += parseFloat(obj[el]);
    }
  }
  return sum;
}

module.exports = router;
