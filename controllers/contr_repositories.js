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

web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);

var controller = {
    getRepositories: function(mode, id, details, callback){
        if(id){
            var stages = mdl_repo.querySingleRepoWithUsersAndProposals(mode, id);
            models.aggregate("repositories_" + mode, stages, function(error, result){
                console.log(result);
                if(!error){
                    if (result.length > 0) {
                        var res = _(result[0].contributors).concat(result[0].users).groupBy('address').map(_.spread(_.assign)).value();       
                        delete result[0].contributors;
                        delete result[0].users;
                        result[0].contributors = res;    
                        console.log('proposals: ', result[0].proposals);
                        callback(result[0], result[0].proposals);
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
                    var res = _(repo.contributors).concat(repo.users).groupBy('address').map(_.spread(_.assign)).value();       
                    delete repo.contributors;
                    delete repo.users;
                    repo.contributors = res;    
                });
                console.log(error, result);
                callback(result);
            });
            /*models.findAll("repositories_" + mode, {}, {}, function(error, result){
                console.log(error, result);
                callback(result);
            });*/
        }
        
    },
    /*getRepositories: function(mode, id, details, callback){
        if(mode === "live"){
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
        } else if (mode === "demo") {
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
        }
        var repositories = [];
        coordinatorContract.getPastEvents('InitializeRepository', {
            filter: {repository: id},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, events) {
            if(error){
                console.error(error);
            } else {
                for(var i = 0; i < events.length; i++){
                    var repository = {
                        hex: events[i].returnValues.repository
                    };
                    await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(async function(result){
                        repository.name = result.name.replace(/^(github\.com\/)/,"");

                        await contr_proposals.getProposals(mode, null, events[i].returnValues.repository).then(async function(result){
                            
                            var countContributors = {};
                            var countLabels = {};

                            repository.contributors = [];
                            repository.labels = [];

                            for(var h = 0; h < result.length; h++){
                                countContributors[result[h].who] = (countContributors[result[h].who] || 0) + 1;
                                countLabels[result[h].label] = (countLabels[result[h].label] || 0) + 1;
                            }
                            repository.labels.push(countLabels);
                            repository.contributors.push(countContributors);

                            if(result && result.length) {
                                var latest = result.reduce(function (r, a) {
                                    return r.openEndDate > a.openEndDate ? r : a;
                                });
                                repository.topicality = latest.openEndDate;
                            }
                            
                            if(details){
                                repository.proposals = result;
                            }

                            for(var j = 0; j < repository.contributors.length; j++){
                                if(Object.keys(repository.contributors[j])[0]){
                                    await contr_address.getAddressTokens(mode, Object.keys(repository.contributors[j])[0]).then(async function(tokens){
                                        repository.contributors[j].KNW = sum(tokens).toFixed(2);
                                        await contr_address.getTwitterName(Object.keys(repository.contributors[j])[0]).then(async function(result){
                                            repository.contributors[j].twitter = result.twitter_screen_name;
                                            var total = 0;
                                            repository.contributors.forEach(item => {
                                                total += item.KNW;
                                            });
                                            
                                            repository.combinedKNW = total;
                                            await repositories.push(repository);
                                        });
                                    });
                                }

                            }
                        });
                    });
                }
                callback(repositories);
            }
        });
    },*/
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
            name
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