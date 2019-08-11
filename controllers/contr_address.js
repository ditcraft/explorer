var models = require('../models/mdl_generics');
var mdl_addr = require('../models/mdl_address');
var Web3 = require('web3');
const BigNumber = require('bignumber.js');
var config = require('../config.json');
//web3 = new Web3(new Web3.providers.HttpProvider('https://dai.poa.network'));
web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));
//web3 = new Web3(new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));


var ditContract = new web3.eth.Contract(config.ABI.KNWToken, config.CONTRACT.DEMO.KNWToken);
var ditToken = new web3.eth.Contract(config.ABI.ditToken, config.CONTRACT.DEMO.ditToken);

var controller = {
    getAddress: function(mode, eth_address, callback){
        var stages = mdl_addr.querySingleAddress(mode, eth_address);
        models.aggregate("users_" + mode, stages, function(error, result){
            console.log(error, result);
            callback(error, result);
        });
    },
    /*getAddress: function(mode, eth_address, callback){
        if(mode === "live"){
            ditContract = new web3.eth.Contract(config.ABI.KNWToken, config.CONTRACT.LIVE.KNWToken);
            ditToken = new web3.eth.Contract(config.ABI.ditToken, config.CONTRACT.LIVE.ditToken);
        } else if (mode === "demo") {
            ditContract = new web3.eth.Contract(config.ABI.KNWToken, config.CONTRACT.DEMO.KNWToken);
            ditToken = new web3.eth.Contract(config.ABI.ditToken, config.CONTRACT.LIVE.ditToken);
        }
        try {
            web3.eth.getBalance(eth_address, function (error, wei) {
                if (!error) {
                    var xDAIBalance = web3.utils.fromWei(wei, 'ether');
                    ditToken.methods.balanceOf(eth_address).call().then(function (xDit, error){
                        var xDitBalance = web3.utils.fromWei(web3.utils.toBN(xDit).toString(), 'ether');
                        controller.getAddressTokens(mode, eth_address).then(function(tokens){
                            controller.getTwitterName(eth_address).then(function(result){
                                if(result){
                                    callback(null, { address: eth_address, twitter: result.twitter_screen_name, balance: tokens, total: sum(tokens).toFixed(2), xDitBalance: parseFloat(xDitBalance).toFixed(2), xDAIBalance: parseFloat(xDAIBalance).toFixed(2) });
                                } else {
                                    callback(null, { address: eth_address, twitter: null, balance: tokens, total: sum(tokens).toFixed(2), xDitBalance: parseFloat(xDitBalance).toFixed(2), xDAIBalance: parseFloat(xDAIBalance).toFixed(2) });
                                }
                            }).catch(e => {
                                callback(e);
                            });
                        }).catch(e => {
                            callback(e);
                        });
                    }).catch(e => {
                        callback(e);
                    });
                }
            });
        } catch (err) {
            callback(err);
        }
    },*/
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
    getTwitterName: function(eth_address){
        return new Promise(function(resolve, reject){
            models.findOne("users", { "eth_address": eth_address }, { "twitter_screen_name" : 1 }, function(error, result){
                if(!error){
                    resolve(result);
                } else {
                    reject(error);
                }
            });
        });
    },
    getAddressTokens: function(mode, eth_address){
        return new Promise(function(resolve, reject){
            if(mode === "live"){
                ditContract = new web3.eth.Contract(config.ABI.KNWToken, config.CONTRACT.LIVE.KNWToken);
                ditToken = new web3.eth.Contract(config.ABI.ditToken, config.CONTRACT.LIVE.ditToken);
            } else if (mode === "demo") {
                ditContract = new web3.eth.Contract(config.ABI.KNWToken, config.CONTRACT.DEMO.KNWToken);
                ditToken = new web3.eth.Contract(config.ABI.ditToken, config.CONTRACT.DEMO.ditToken);
            }
            var obj;
            var label = "";
            var balance = "";
            var tokens = [];
            ditContract.methods.labelCountOfAddress(eth_address).call().then(async function(labelCount, error){
                for(var i = 1; i <= parseInt(labelCount); i++){
                obj = {};
                await ditContract.methods.labelOfAddress(eth_address, i).call().then(async function(labelString){
                    label = labelString;
                        await ditContract.methods.balanceOfLabel(eth_address, labelString).call().then(function(labelBalance){
                            balance = web3.utils.toBN(labelBalance).toString();
                            obj[label] = web3.utils.fromWei(balance, 'ether');
                            tokens.push(obj);
                        });
                    });
                }
                resolve(Object.assign({}, ...tokens));
            }).catch(e => {
                reject(e);
            });
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