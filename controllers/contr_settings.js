var models = require('../models/mdl_generics');

var controller = {
    getUserData: function(address, callback){
        models.findOne('users', { dit_address: address }, {}, function(error, result){
            if(!error){
                callback(null, result);
            }
        });        
    },

    setMainAccount: function(address, provider, callback){
        models.update('users', { dit_address: address }, { main_account: provider }, function(error, result){
            if(!error){
                callback(true);            
            }
        });
    }
}

module.exports = controller;