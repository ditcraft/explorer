var models = require('../models/mdl_generics');
var mdl_addr = require('../models/mdl_address');

var controller = {
    getAddress: function(mode, eth_address, callback){
        var stages = mdl_addr.querySingleAddress(mode, eth_address);
        models.aggregate("users_" + mode, stages, function(error, result){
            console.log(error, result);
            if(result.length > 0){
                for(var i = 0; i < result[0].repositories.length; i++){ 
                    if (!result[0].repositories[i].name) {
                        result[0].repositories.splice(i, 1); 
                        i--;
                    }
                }
                callback(error, result);
            } else {
                callback("Address not found", null);
            }
        });
    },
    getAddressByTwitterID: function(mode, twitterID, callback){
        models.findOne("users_" + mode, { "twitter_id": twitterID }, { "address" : 1 }, function(error, result){
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
    },
    getTwitterName: function(eth_address){
        return new Promise(function(resolve, reject){
            models.findOne("users", { "eth_address": eth_address }, { "twitter_screen_name" : 1 }, function(error, result){
                if(!error){
                    resolve(result);
                } else {
                    reject(error);
                }
            });
        });
    }
}

module.exports = controller;