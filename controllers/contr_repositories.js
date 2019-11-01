var Web3 = require('web3');
var config = require('../config.json');
var contr_proposals = require('./contr_proposals');
var contr_address = require('./contr_address');
const Octokit = require('@octokit/rest');
const { Gitlab } = require('gitlab');
const Bitbucket = require('bitbucket');
var models = require('../models/mdl_generics');
var mdl_repo = require('../models/mdl_repositories');
const _ = require('lodash');
var mongo = require('mongodb');
var async = require('async');

web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);

var controller = {
    getRepositories: function(mode, id, details, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }

        if(id){
            var stages = mdl_repo.querySingleRepoWithUsersAndProposals(mode, id);
            models.aggregate("repositories_" + mode, stages, function(error, result){
                if(!error){
                    if (result.length > 0) {
                        result[0].contributors.forEach(function(obj) {
                            obj.dit_address = obj.address;
                            delete obj.address;
                        });
                        var res = _(result[0].contributors).concat(result[0].users).groupBy('dit_address').map(_.spread(_.assign)).value();     
                        delete result[0].contributors;
                        delete result[0].users;

                        //Add Usernames to contributors
                        async.each(res, function(contrib, callback) {
                            if(contrib.twitter_id && contrib.main_account === "twitter"){
                                contr_address.getTwitterName(contrib.twitter_id, function(error, twitter_name){
                                    contrib.user_name = twitter_name;
                                    callback();
                                });
                            } else if(contrib.github_id && contrib.main_account === "github"){
                                contr_address.getGitHubName(contrib.github_id, function(error, github_name){
                                    contrib.user_name = github_name;
                                    callback();
                                });
                            } else {
                                callback();
                            }
                        }, function(err) {
                            result[0].contributors = res;

                            //Add usernames to proposers in proposals
                            async.each(result[0].proposals, function(proposal, callback) {
                                
                                if(proposal.proposer[0] && proposal.proposer[0].twitter_id && proposal.proposer[0].main_account === "twitter"){
                                    contr_address.getTwitterName(proposal.proposer[0].twitter_id, function(error, twitter_name){
                                        proposal.proposer[0].user_name = twitter_name;
                                        callback();
                                    });
                                } else if(proposal.proposer[0] && proposal.proposer[0].github_id && proposal.proposer[0].main_account === "github"){
                                    contr_address.getGitHubName(proposal.proposer[0].github_id, function(error, github_name){
                                        proposal.proposer[0].user_name = github_name;
                                        callback();
                                    });
                                } else {
                                    callback();
                                }
                            }, function(err) {
                                console.log('proposals: ', result[0].proposals[0].proposer);
                                callback(result[0], result[0].proposals);
                            });
                        });
                    } else {
                        callback(null, null);
                    }
                } else {
                    console.log('error: ', error);
                }
            });
        } else {
            var stages = mdl_repo.queryRepoWithUsers(mode);
            models.aggregate("repositories_" + mode, stages, function(error, result){
                result.forEach(repo => {
                    var res = _(repo.contributors).concat(repo.users).groupBy('dit_address').map(_.spread(_.assign)).value();       
                    delete repo.contributors;
                    delete repo.users;
                    repo.contributors = res;    
                });
                console.log(error, result);
                callback(result);
            });
        }
    },
    getAssociatedRepositories: function(mode, id, callback){
        if(mode === "live"){
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
        } else if (mode === "demo") {
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
        }
        var repositories = [];
        var repository = {};
        coordinatorContract.getPastEvents('InitializeRepository', {
            filter: {who: id},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, events) {
            if(error){
                console.error(error);
            } else {
                for(var i = 0; i < events.length; i++){
                    repository.hex = events[i].returnValues.repository;          
                    await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(async function(result){
                        repository.name = result.name.replace(/^(github\.com\/)/,"");
                        repositories.push(repository);
                    });
                }
                
                coordinatorContract.getPastEvents('ProposeCommit', {
                    filter: {who: id},
                    fromBlock: 0,
                    toBlock: 'latest'
                }, async function(error, events) {
                    if(error){
                        console.error(error);
                    } else {
                        for(var i = 0; i < events.length; i++){
                            repository.hex = events[i].returnValues.repository;
                            await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(async function(result){
                                repository.name = result.name.replace(/^(github\.com\/)/,"");
                                repositories.push(repository);
                            });
                        }
                        callback(getUnique(repositories));
                    }
                });
            }
        });
    },
    createGithubRepository: function(name, accessToken, callback){
        var octokit = new Octokit({
            auth: accessToken
        });
        octokit.repos.createForAuthenticatedUser({
            name,
            auto_init: true
        }).then(function (result){
            callback(null, result);
        }).catch(function (error){
            console.error(error);
            callback(error, null);
        });
    },
    createGitlabRepository: async function(name, accessToken, callback){
        const api = new Gitlab({
            oauthToken: accessToken,
        });
        
        api.Projects.create({ name: name, visibility: 'public' }).then(function (result){
            callback(null, result);
        }).catch(function (error){
            console.error(error);
            callback(error, null);
        });
    },
    createBitbucketRepository: async function(name, username, accessToken, callback){
        const bitbucket = new Bitbucket();
        bitbucket.authenticate({
            type: 'token',
            token: accessToken
        });

        bitbucket.repositories.create({ repo_slug: name, username: username }).then(({ data, headers }) => {
            callback(null, data);
        }).catch(function (error){
            console.error(error);
            callback(error, null);
        });
    },
    checkRepoInit: async function(mode, name, callback){
        console.log('checking repoInit: ', mode, name);
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        if(mode === "live"){
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
        } else if (mode === "demo") {
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
        }

        await coordinatorContract.events.InitializeRepository({
            filter: {},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, event){ 
            if(error){
                console.error(error);
            } else {
                var hex = event.returnValues.repository;
                await coordinatorContract.methods.repositories(hex).call().then(async function(result){
                    if(result.name + '.git' === name){
                        callback(hex, name);
                    } else {
                        callback(null);
                    }
                });
            };
        }).on('data', function(event){
            //console.log(event); // same results as the optional callback above
        }).on('changed', function(event){
            console.log('changed: ', event);
            // remove event from local database
        }).on('error', console.error);
    },
    subscribeToRepository: function(repository, update, mode, id, user, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        repository.notifications = true;
        repository.last_activity_date = new Date();
        repository.earned_knw = new mongo.Double(0.0);
        repository.amount_of_proposals = parseInt(0);
        repository.amount_of_validations = parseInt(0);

        if(update){
            models.findOne("users", { dit_address: user.eth_address, ["repositories_" + mode + ".hash"]: id }, { ["repositories_" + mode + ".$.notifications"]: 1 }, function(error, result){
                if(result && result['repositories_' + mode] && result['repositories_' + mode].length === 1){
                    var notify = !result['repositories_' + mode][0].notifications;
                    models.update("users", { dit_address: user.eth_address, ["repositories_" + mode + ".hash"] : id }, { ["repositories_" + mode + ".$.notifications"]: notify }, function(error, result){
                        callback(notify);
                    });
                } else {
                    models.updateAddToSet("users", { dit_address: user.eth_address }, { ["repositories_" + mode]: repository }, function(error, result){
                        callback(true);
                    });
                }
            });
        } else {
            models.findOne("users", { dit_address: user.eth_address, ["repositories_" + mode + ".hash"] : id }, { ["repositories_" + mode + ".$.notifications"]: 1 }, function(error, result){
                if(result && result['repositories_' + mode] && result['repositories_' + mode].length === 1){
                    callback(result['repositories_' + mode][0].notifications);
                } else {
                    callback(false);
                }
            });
        }
    }
}

function sum(obj) {
    var sum = 0;
    for(var el in obj) {
        if(obj.hasOwnProperty(el) ) {
        sum += parseFloat(obj[el]);
        }
    }
    return sum;
}

function getUnique(arr, comp) {
    const unique = arr
         .map(e => e[comp])
      .map((e, i, final) => final.indexOf(e) === i && i)
      .filter(e => arr[e]).map(e => arr[e]);
  
     return unique;
}

module.exports = controller;