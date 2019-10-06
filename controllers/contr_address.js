var models = require('../models/mdl_generics');
var mdl_addr = require('../models/mdl_address');
var ObjectID = require('mongodb').ObjectID

var userObject = {
    "address": "",
    "authorized_addresses": {
      "dit_cli": "",
      "dit_explorer": "",
      "alice": ""
    },
    "twitter_id": "",
    "github_id": "",
    "github_token": "",
    "main_account": "",
    "xdai_balance" : 0, 
    "xdit_balance" : 0, 
    "knw_tokens" : [], 
    "proposals" : [], 
    "repositories" : []
}

var controller = {
    getAddress: function(mode, eth_address, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }

        var stages = mdl_addr.querySingleAddress(mode, eth_address);
        models.aggregate("users_" + mode, stages, function(error, result){
            console.log(error, result);
            if(result.length > 0){
                for(var i = 0; i < result[0].repositories.length; i++){ 
                    if (result[0].repositories[i].amount_of_proposals === 0 && result[0].repositories[i].amount_of_validations === 0) {
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
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        models.findOne("users_" + mode, { "twitter_id": twitterID }, { "address" : 1 }, function(error, result){
            callback(error, result);
        });
    },
    checkIfValidAddress: function(mode, req, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }

        if(web3.utils.isAddress(req.body.address)){
            models.findOne("users_" + mode, { "address": req.body.address }, {}, function(error, result){
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
    },
    getAddressByGitHubID: function(mode, githubID, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        models.findOne("users_" + mode, { "github_id": githubID }, { "address" : 1 }, function(error, result){
            callback(error, result);
        });
    },
    connectGitHub: function(mode, githubID, eth_address, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        models.findOne("users_" + mode, { "github_id": githubID }, { "address" : 1 }, function(error, result){
            if(result === null){
                models.findOne("users_" + mode, { "address": eth_address }, { "github_id" : 1 }, function(error, result){
                    if (result === null){
                        userObject.address = eth_address;
                        userObject.github_id = githubID;
                        models.addNew("users_" + mode, userObject, function(error, result){
                            callback(true);
                        });
                    } else if(result.github_id !== null && result.github_id !== '' ){
                        callback(false);
                    } else {
                        models.update("users_" + mode, { "_id": ObjectID(result._id)}, { "github_id": githubID}, function(error, result){
                            callback(true);
                        });
                    }
                });
            } else {
                callback(false, result.address);
            }   
        });
    }
}

module.exports = controller;