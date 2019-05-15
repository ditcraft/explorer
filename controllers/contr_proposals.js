var Web3 = require('web3');
const BigNumber = require('bignumber.js');
var config = require('../config.json');

web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
var votingContract = new web3.eth.Contract(config.ABI.KNWVoting, config.CONTRACT.DEMO.KNWVoting);

var controller = {
    getAllProposals: function(callback){
        var proposals = [];
        coordinatorContract.getPastEvents('ProposeCommit', {
            filter: {},
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
            callback(proposals);
        });
    }
}

module.exports = controller;