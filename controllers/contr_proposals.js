var mdl_propo = require('../models/mdl_proposals');
var models = require('../models/mdl_generics');
var contr_address = require('./contr_address');
var async = require('async');

var controller = {
    getProposals: function(mode, who, repository, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        var stages = mdl_propo.queryAllProposals(mode);
        models.aggregate("proposals_" + mode, stages, function(error, result){
            async.each(result, function(proposal, callback) {
                if(proposal.proposer[0].twitter_id && proposal.proposer[0].main_account === "twitter"){
                    contr_address.getTwitterName(proposal.proposer[0].twitter_id, function(error, twitter_name){
                        proposal.proposer[0].user_name = twitter_name;
                        callback();
                    });
                } else if(proposal.proposer[0].github_id && proposal.proposer[0].main_account === "github"){
                    contr_address.getGitHubName(proposal.proposer[0].github_id, function(error, github_name){
                        proposal.proposer[0].user_name = github_name;
                        callback();
                    });
                } else {
                    callback();
                }
            }, function(err) {
                callback(error, result);
            });
        });
    }
}

module.exports = controller;