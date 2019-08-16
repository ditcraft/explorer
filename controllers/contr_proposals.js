var mdl_propo = require('../models/mdl_proposals');
var models = require('../models/mdl_generics');

var controller = {
    getProposals: function(mode, who, repository, callback){
        if(typeof mode === "undefined"){
            mode = "demo";
        }
        
        var stages = mdl_propo.queryAllProposals(mode);
        models.aggregate("proposals_" + mode, stages, function(error, result){
            callback(error, result);
        });
    }
}

module.exports = controller;