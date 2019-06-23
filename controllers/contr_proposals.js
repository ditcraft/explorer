var Web3 = require('web3');
const BigNumber = require('bignumber.js');
var config = require('../config.json');
var contr_address = require('./contr_address');

web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
var votingContract = new web3.eth.Contract(config.ABI.KNWVoting, config.CONTRACT.DEMO.KNWVoting);

var controller = {
    getProposals: function(mode, who, repository){
        return new Promise(function(resolve, reject){
            if(mode === "live"){
                coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
                votingContract = new web3.eth.Contract(config.ABI.KNWVoting, config.CONTRACT.LIVE.KNWVoting);
            } else if (mode === "demo") {
                coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
                votingContract = new web3.eth.Contract(config.ABI.KNWVoting, config.CONTRACT.DEMO.KNWVoting);
            }
            var proposals = [];
            coordinatorContract.getPastEvents('ProposeCommit', {
                filter: {who: who, repository: repository},
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
                        await contr_address.getTwitterName(events[i].returnValues.who).then(async function(result){
                            if(result){
                                proposal.twitter = result.twitter_screen_name;
                            }
                            await coordinatorContract.methods.proposalsOfRepository(proposal.repository, parseInt(proposal.proposal)).call().then(async function(result){
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
                                    await coordinatorContract.methods.repositories(proposal.repository).call().then(function(result){
                                        proposal.repositoryName = result.name.replace(/^(github\.com\/)/,"");
                                        proposals.push(proposal);
                                    });
                                });
                            });
                        });
                    };
                }
                resolve(proposals);
            }).catch(error => {
                reject(error);
            });
    });
    }
}

module.exports = controller;