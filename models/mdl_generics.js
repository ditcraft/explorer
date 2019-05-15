var MongoClient = require('mongodb').MongoClient;
const config = require('../config');

const url = config.MONGODB_CONNECTION;
const dbName = 'twitterbot';

var model = {
    findAll: function(collection, query, projection, callback){
        MongoClient.connect(url, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                
                col.find(query).project(projection).toArray(function(err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    },
    findOne: function(collection, query, projection, callback){
        MongoClient.connect(url, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                
                col.findOne(query, { projection: projection }, function(err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    },
    addNew: function(collection, data, callback){
        MongoClient.connect(url, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                
                col.insertOne(data, function(err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    }
}

module.exports = model;