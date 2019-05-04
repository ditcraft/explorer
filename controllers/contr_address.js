var models = require('../models/mdl_generics');
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider('https://dai.poa.network'));

var controller = {
    getAddressByTwitterID: function(twitterID, callback){
        models.findOne("users", { "twitter_id": twitterID }, { "eth_address" : 1 }, function(error, result){
            callback(error, result);
        });
    },
    checkIfValidAddress: function(req, callback){
        if(web3.utils.isAddress(req.body.address)){
            models.findOne("users", { "eth_address": req.body.address }, {}, function(error, result){
                if(result){
                    callback(false);
                } else {
                    callback(true);
                }
            });
        } else {
            callback(false);
        }
    }
}

module.exports = controller;