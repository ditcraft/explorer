var models = require('../models/mdl_generics');
var mdl_addr = require('../models/mdl_address');
var ObjectID = require('mongodb').ObjectID;
const https = require('https');
var Twitter = require('twitter');
var config = require('../config');
var async = require('async');


var userObject = {
    "dit_address": "",
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
        models.aggregate("users", stages, function(error, result){
            console.log(error, result);
            if(result.length > 0){
                for(var i = 0; i < result[0].repositories.length; i++){ 
                    if (result[0].repositories[i].amount_of_proposals === 0 && result[0].repositories[i].amount_of_validations === 0) {
                        result[0].repositories.splice(i, 1); 
                        i--;
                    }
                }

                async.each(result[0].proposals, function(proposal, callback) {
                    if(proposal.proposer[0].twitter_id && proposal.proposer[0].main_account === "twitter"){
                        controller.getTwitterName(proposal.proposer[0].twitter_id, function(error, twitter_name){
                            proposal.proposer[0].user_name = twitter_name;
                            callback();
                        });
                    } else if(proposal.proposer[0].github_id && proposal.proposer[0].main_account === "github"){
                        controller.getGitHubName(proposal.proposer[0].github_id, function(error, github_name){
                            proposal.proposer[0].user_name = github_name;
                            callback();
                        });
                    } else {
                        callback();
                    }
                }, function(err) {
                    if(result[0].twitter_id && result[0].main_account === "twitter"){
                        controller.getTwitterName(result[0].twitter_id, function(error, twitter_name){
                            result[0].user_name = twitter_name;
                            callback(error, result);
                        });
                    } else if (result[0].github_id && result[0].main_account === "github") {
                        controller.getGitHubName(result[0].github_id, function(error, github_name){
                            result[0].user_name = github_name;
                            callback(error, result);
                        });
                    } else {
                        callback(error, result);
                    }
                });
            } else {
                callback("Address not found", null);
            }
        });
    },
    getAddressByTwitterID: function(mode, twitterID, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        models.findOne("users", { "twitter_id": twitterID }, { "dit_address" : 1 }, function(error, result){
            callback(error, result);
        });
    },
    checkIfValidAddress: function(mode, req, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }

        if(web3.utils.isAddress(req.body.address)){
            models.findOne("users", { "dit_address": req.body.address }, {}, function(error, result){
                if(result.twitter_id || result.github_id){
                    callback(false);
                } else {
                    callback(true);
                }
            });
        } else {
            callback(false);
        }
    },
    getTwitterName: function(twitter_id, callback){
        var client = new Twitter({
            consumer_key: config.TWITTER_API_KEY,
            consumer_secret: config.TWITTER_API_SECRET,
            access_token_key: config.TWITTER_ACCESS_TOKEN,
            access_token_secret: config.TWITTER_ACCESS_TOKEN_SECRET
        });
        
        var params = {user_id: twitter_id};
        client.get('users/show', params, function(error, profile, response) {
            if (!error) {
                callback(null, profile.screen_name);
            } else {
                callback(error, null);
            }
        });
    },
    getGitHubName: function(github_id, callback){
        const options = {
            hostname: 'api.github.com',
            path: '/user/' + github_id + '?client_id=' + config.GITHUB_API_KEY + '&client_secret=' + config.GITHUB_API_SECRET,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };
        
        https.get(options, (resp) => {
            let data = '';

            // A chunk of data has been received.
            resp.on('data', (chunk) => {
            data += chunk;
            });

            // The whole response has been received. Call back the result.
            resp.on('end', () => {
                var obj = JSON.parse(data);
                console.log('obj: ', obj);
                callback(null, obj.login);
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
            callback(err, null);
        });
    },
    getAddressByGitHubID: function(mode, githubID, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        models.findOne("users", { "github_id": githubID }, { "dit_address" : 1 }, function(error, result){
            callback(error, result);
        });
    },
    connectGitHub: function(mode, githubID, eth_address, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        models.findOne("users", { "github_id": githubID }, { "address" : 1 }, function(error, result){
            if(result === null){
                models.findOne("users", { "dit_address": eth_address }, { "github_id" : 1 }, function(error, result){
                    if (result === null){
                        userObject.dit_address = eth_address;
                        userObject.github_id = githubID;
                        models.addNew("users", userObject, function(error, result){
                            callback(true);
                        });
                    } else if(result.github_id !== null && result.github_id !== '' ){
                        console.log('test');
                        callback(false);
                    } else {
                        models.update("users", { "_id": ObjectID(result._id)}, { "github_id": githubID}, function(error, result){
                            callback(true);
                        });
                    }
                });
            } else {
                console.log('GitHub account already connected');
                callback(false, result.dit_address);
            }   
        });
    },

    connectAccount: function(mode, provider, ID, eth_address, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }

        var obj = {};
        var key = provider + "_id";
        obj[key] = ID;
        obj.main_account = provider;

        models.findOne("users", obj, { "address" : 1 }, function(error, result){
            if(result === null){
                models.findOne("users", { "dit_address": eth_address }, { "github_id" : 1, "twitter_id": 1 }, function(error, result){
                    if (result === null){
                        userObject.dit_address = eth_address;
                        userObject.main_account = provider;
                        userObject[key] = ID;
                        models.addNew("users", userObject, function(error, result){
                            controller.passKYC(eth_address, function(error, result){
                                if(!error){
                                    callback(true);
                                } else {
                                    callback(false);
                                }
                            });
                        });
                    } else if((result.github_id !== null && result.github_id !== '') || (result.twitter_id !== null && result.twitter_id !== '')){
                        callback(false);
                    } else {
                        models.update("users", { "_id": ObjectID(result._id)}, obj, function(error, result){
                            controller.passKYC(eth_address, function(error, result){
                                if(!error){
                                    callback(true);
                                } else {
                                    callback(false);
                                }
                            });
                        });
                    }
                });
            } else {
                callback(false, result.dit_address);
            }   
        });
    },

    passKYC: function (address, callback){
        const data = JSON.stringify({
            api_key: config.DIT_API_KEY,
            address: address
        });

        const options = {
            hostname: 'server.ditcraft.io',
            path: '/api/kyc',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = https.request(options, (res) => {
            console.log(`statusCode: ${res.statusCode}`)
            
            res.on('data', (d) => {
                console.log('data: ', d.toString());
                callback(null, true);
            });
        });
          
        req.on('error', (error) => {
            console.error('error: ', error);
            callback(true, null);
        });
          
        req.write(data);
        req.end();
    }
}

module.exports = controller;