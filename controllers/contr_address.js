var models = require('../models/mdl_generics');
var Web3 = require('web3');
const BigNumber = require('bignumber.js');
var config = require('../config.json');
//web3 = new Web3(new Web3.providers.HttpProvider('https://dai.poa.network'));
web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));
//web3 = new Web3(new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
var votingContract = new web3.eth.Contract(config.ABI.KNWVoting, config.CONTRACT.DEMO.KNWVoting);

var controller = {
    getAddress: function(eth_address, callback){
        web3 = new Web3(new Web3.providers.HttpProvider('https://dai.poa.network'));
        var ditContract = new web3.eth.Contract(config.ABI.KNWToken, config.CONTRACT.DEMO.KNWToken);
        var ditToken = new web3.eth.Contract(config.ABI.ditToken, config.CONTRACT.LIVE.ditToken);

        try {
            web3.eth.getBalance(eth_address, function (error, wei) {
                if (!error) {
                    var xDAIBalance = web3.utils.fromWei(wei, 'ether');
                    ditToken.methods.balanceOf(eth_address).call().then(function (xDit, error){
                        var xDitBalance = web3.utils.fromWei(web3.utils.toBN(xDit).toString(), 'ether');
                        var obj;
                        var label = "";
                        var balance = "";
                        controller.getProposalsByAddress(eth_address, (error, proposals) => {
                            if(!error){
                                ditContract.methods.labelCountOfAddress(eth_address).call().then(async function(labelCount, error){
                                    for(var i = 1; i <= parseInt(labelCount); i++){
                                      obj = {};
                                      await ditContract.methods.labelOfAddress(eth_address, i).call().then(async function(labelString){
                                        label = labelString;
                                         await ditContract.methods.balanceOfLabel(eth_address, labelString).call().then(function(labelBalance){
                                           balance = web3.utils.toBN(labelBalance).toString();
                                           obj[label] = web3.utils.fromWei(balance, 'ether')
                                         });
                                       });
                                     }
                                    callback(error, { address: eth_address, balance: obj, total: sum(obj).toFixed(2), proposals: proposals, xDitBalance: parseFloat(xDitBalance).toFixed(2), xDAIBalance: parseFloat(xDAIBalance).toFixed(2) });
                                  }).catch(e => {
                                    callback(e);
                                });
                            } else {
                                callback(error);
                            }
                        });
                    });
                }
            });
        } catch (err) {
            callback(err);
        }
    },
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
    },
    getTwitterName: function(eth_address, callback){
        models.findOne("users", { "eth_address": eth_address }, { "twitter_screen_name" : 1 }, function(error, result){
            callback(error, result);
        });
    },
    getProposalsByAddress: function(eth_address, callback){
        var proposals = [];
        coordinatorContract.getPastEvents('ProposeCommit', {
            filter: {who: eth_address},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, events) {
            if(error){
                console.error(error);
            } else {
                for(var i = 0; i < events.length; i++){
                    var proposal = {
                        repository: events[i].returnValues.repository,
                        proposal: new BigNumber(events[i].returnValues.proposal._hex),
                        who: events[i].returnValues.who,
                        label: events[i].returnValues.label,
                        numberOfKNW: new BigNumber(events[i].returnValues.numberOfKNW._hex) / Math.pow(10, 18)
                    };
                    await coordinatorContract.methods.proposalsOfRepository(events[i].returnValues.repository, parseInt(events[i].returnValues.proposal._hex)).call().then(async function(result){
                        proposal.KNWVoteID = new BigNumber(result.KNWVoteID._hex);
                        proposal.isFinalized = result.isFinalized;
                        proposal.proposalAccepted = result.proposalAccepted;
                        proposal.individualStake = new BigNumber(result.individualStake._hex) / Math.pow(10, 18);
                        //proposal.totalStake = new BigNumber(result.totalStake._hex);
                        await votingContract.methods.votes(parseInt(result.KNWVoteID._hex)).call().then(async function(result){
                            proposal.commitEndDate = new BigNumber(result.commitEndDate._hex);
                            proposal.openEndDate = new BigNumber(result.openEndDate._hex);
                            proposal.neededMajority = new BigNumber(result.neededMajority._hex);
                            proposal.winningPercentage = new BigNumber(result.winningPercentage._hex);
                            proposal.votesFor = new BigNumber(result.votesFor._hex) / Math.pow(10, 18);
                            proposal.votesAgainst = new BigNumber(result.votesAgainst._hex) / Math.pow(10, 18);
                            proposal.votesUnrevealed = new BigNumber(result.votesUnrevealed._hex);
                            proposal.participantsFor = new BigNumber(result.participantsFor._hex);
                            proposal.participantsAgainst = new BigNumber(result.participantsAgainst._hex);
                            proposal.participantsUnrevealed = new BigNumber(result.participantsUnrevealed._hex);
                            proposal.isResolved = result.isResolved;
                            await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(function(result){
                                proposal.repositoryName = result.name;
                                proposals.push(proposal);
                            });
                        });
                    });
                };
            }
            callback(error, proposals);
        }).catch(e => {
            callback(e, proposals);
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

module.exports = controller;