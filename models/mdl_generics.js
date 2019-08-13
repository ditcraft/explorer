var MongoClient = require('mongodb').MongoClient;
const config = require('../config');

const url = config.MONGODB_CONNECTION;
const dbName = 'ditIndex';

var model = {
    findAll: function(collection, query, projection, callback){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
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
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
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
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
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
    },
    aggregate: function (collection, queryArray, callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                
                col.aggregate(queryArray, { allowDiskUse: true }).toArray(function(err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    },
    update: function (collection, query, data, callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                col.updateOne(query, { $set: data }, function (err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    },
    updateAddToArray: function (collection, query, data, callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                col.updateOne(query, { $push: data }, function (err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    },
    updateAddToSet: function (collection, query, data, callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            if (err) {
                console.error('An error occurred connecting to MongoDB: ', err);
            } else {
                const db = client.db(dbName);
                const col = db.collection(collection);
                col.updateOne(query, { $addToSet: data }, function (err, result) {
                    client.close();
                    callback(err, result);
                });
            }
        });
    }
}

module.exports = model;