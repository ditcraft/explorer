var Web3 = require('web3');
const BigNumber = require('bignumber.js');
var config = require('../config.json');
var contr_proposals = require('./contr_proposals');
var contr_address = require('./contr_address');

web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);

var controller = {
    getRepositories: function(mode, id, details, callback){
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

                            var latest = result.reduce(function (r, a) {
                                return r.openEndDate > a.openEndDate ? r : a;
                            });

                            repository.topicality = latest.openEndDate;
                            
                            if(details){
                                repository.proposals = result;
                            }

                            for(var j = 0; j < repository.contributors.length; j++){
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
                        });
                    });
                }
                callback(repositories);
            }
        });
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