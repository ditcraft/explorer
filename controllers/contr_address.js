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
    "knw_tokens_live" : [], 
    "knw_tokens_demo" : [], 
    "proposals_live" : [], 
    "proposals_demo" : [], 
    "repositories_live" : [],
    "repositories_demo" : []
}

var controller = {
    getAddress: function(mode, eth_address, callback){
        console.log('getAddress: ', eth_address, mode);
        if(typeof mode === "undefined"){
            mode = "demo";
        }

        var stages = mdl_addr.querySingleAddress(mode, eth_address);
        models.aggregate("users", stages, function(error, result){
            if(result.length > 0){
                if(result[0].repositories){
                    for(var i = 0; i < result[0].repositories.length; i++){ 
                        if (result[0].repositories[i].amount_of_proposals === 0 && result[0].repositories[i].amount_of_validations === 0) {
                            result[0].repositories.splice(i, 1); 
                            i--;
                        }
                    }
                }

                if(result[0].proposals){
                    async.each(result[0].proposals, function(proposal, callback) {
                        if(proposal.proposer[0] && proposal.proposer[0].twitter_id && proposal.proposer[0].main_account === "twitter"){
                            controller.getTwitterName(proposal.proposer[0].twitter_id, function(error, twitter_name){
                                proposal.proposer[0].user_name = twitter_name;
                                callback();
                            });
                        } else if(proposal.proposer[0] && proposal.proposer[0].github_id && proposal.proposer[0].main_account === "github"){
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
                }
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
        console.log('Checking if address is valid...');
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        console.log('Mode: ', mode);
        console.log('Address: ', req.body.address);

        if(web3.utils.isAddress(req.body.address)){
            console.log('Passed web3 check.');
            models.findOne("users", { "dit_address": req.body.address }, {}, function(error, result){
                if(result && (result.twitter_id || result.github_id)){
                    console.log('Address already exists and has already been associated.');
                    callback(false);
                } else {
                    console.log('Address is free to take.');
                    callback(true);
                }
            });
        } else {
            console.log('Failed web3 check.');
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
        console.log('Trying to connect account...');

        if(typeof mode === "undefined"){
            mode = "demo";
        }

        console.log('Mode: ', mode);
        console.log('Provider: ', provider);
        console.log('ID: ', ID);
        console.log('Address: ', eth_address);

        var obj = {};
        var key = provider + "_id";
        obj[key] = ID;
        obj.main_account = provider;


        models.findOne("users", obj, { "dit_address" : 1 }, function(error, result){
            if(result === null){
                console.log('Account has not been associated with address before. Now checking for address...');
                models.findOne("users", { "dit_address": eth_address }, { "github_id" : 1, "twitter_id": 1 }, function(error, result){
                    if (result === null){
                        userObject.dit_address = eth_address;
                        userObject.main_account = provider;
                        userObject[key] = ID;

                        console.log('Address does not exist already. Creating new entry: ', userObject);

                        models.addNew("users", userObject, function(error, result){
                            if(!error){
                                console.log('Added new user entry. Triggering KYC next.');
                                controller.passKYC(eth_address, function(error, result){
                                    if(!error){
                                        console.log('Succesfully passed KYC.');
                                        callback(true);
                                    } else {
                                        console.log('Error passing KYC.');
                                        callback(false);
                                    }
                                });
                            }
                        });
                    } else if((result.github_id !== null && result.github_id !== '') || (result.twitter_id !== null && result.twitter_id !== '')){
                        console.log('Address exists already and has already been associated with another provider');
                        callback(false);
                    } else {
                        console.log('Address exists already, but has not been associated with a provider. Claiming next...');
                        console.log('Object to be updated: ', obj);
                        models.update("users", { "_id": ObjectID(result._id)}, obj, function(error, result){
                            if(!error){
                                console.log('Successfully claimed address. Triggering KYC next.');
                                controller.passKYC(eth_address, function(error, result){
                                    if(!error){
                                        console.log('Succesfully passed KYC.');
                                        callback(true);
                                    } else {
                                        console.log('Error passing KYC.');
                                        callback(false);
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                console.log('This ' + provider + ' account has already been associated with the address ', result.dit_address);
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
            },
            timeout: 30000
        };
        
        const req = https.request(options, (res) => {
            console.log(`KYC Status: ${res.statusCode}`)
            
            res.on('data', (d) => {
                console.log('Response: ', d.toString());
                callback(null, true);
            });
        });
          
        req.on('error', (error) => {
            console.error('KYC Error: ', error);
            callback(true, null);
        });

        req.on('timeout', () => {
            console.log('KYC timed out!');
            callback(true, null);
            req.abort();
        });
          
        req.write(data);
        req.end();
    }
}

module.exports = controller;