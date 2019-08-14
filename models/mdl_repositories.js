var mongodb = require('mongodb');
var ObjectId = mongodb.ObjectID;

var mdlRepositories = {
    queryRepoWithUsers: function(mode) {
        var stages = [
            // Stage 1
            {
                $lookup: // Equality Match
                {
                    from: "users_" + mode,
                    localField: "contributors.address",
                    foreignField: "address",
                    as: "users"
                }
            },
            {
                $unwind: {
                    path : "$users",
                    preserveNullAndEmptyArrays : true
                }
            },

            {
                $group: {
                "_id": "$_id",
                "hash": { "$first": "$hash" },
                "name":  { "$first": "$name" },
                "provider":  { "$first": "$provider" },
                "url":  { "$first":"$url"},
                "creation_date": { "$first": "$creation_date"},
                "last_activity_date": {"$first": "$last_activity_date"},
                "majority": { "$first": "$majority" },
                "knw_labels" : { "$first": "$knw_labels"},
                "proposals": {"$first": "$proposals"},
                "contributors": {"$first": "$contributors"},
                "users": {"$push": "$users"},
                    "combinedKNW": { 
                    "$sum": { "$sum": "$users.knw_tokens.balance" } 
                }
                }
            }
        ]
        return stages;
    },
    querySingleRepoWithUsersAndProposals: function(mode, id) {
        var stages = [
            {
                $match: {
                    hash: id
                }
            },
            {
                $lookup: // Equality Match
                {
                    from: "users_" + mode,
                    localField: "contributors.address",
                    foreignField: "address",
                    as: "users"
                }
            },
            {
                $lookup: // Equality Match
                {
                    from: "proposals_" + mode,
                    localField: "hash",
                    foreignField: "repository",
                    as: "proposals"
                }
            },

            // Stage 9
            {
                $unwind: {
                    path : "$proposals",
                    preserveNullAndEmptyArrays : true
                }
            },

            {
                $sort: {
                    "proposals.creation_date": -1
                }
            },

            // Stage 10
            {
                $lookup: // Equality Match
                {
                    from: "users_" + mode,
                    localField: "proposals.proposer",
                    foreignField: "address",
                    as: "proposals.proposer"
                }
            },

            // Stage 11
            {
                $lookup: // Equality Match
                {
                    from: "repositories_" + mode,
                    localField: "proposals.repository",
                    foreignField: "hash",
                    as: "proposals.repository"
                }
            },

            // Stage 12
            {
                $group: {
                "_id": "$_id",
                "hash": { "$first": "$hash" },
                "name":  { "$first": "$name" },
                "provider":  { "$first": "$provider" },
                "url":  { "$first":"$url"},
                "creation_date": { "$first": "$creation_date"},
                "last_activity_date": {"$first": "$last_activity_date"},
                "majority": { "$first": "$majority" },
                "knw_labels" : { "$first": "$knw_labels"},
                "proposals": {"$push": "$proposals"},
                "contributors": {"$first": "$contributors"},
                "users": {"$first": "$users"}
                }
            },

            {
                $unwind: {
                    path : "$users",
                    preserveNullAndEmptyArrays : true
                }
            },

            {
                $group: {
                "_id": "$_id",
                "hash": { "$first": "$hash" },
                "name":  { "$first": "$name" },
                "provider":  { "$first": "$provider" },
                "url":  { "$first":"$url"},
                "creation_date": { "$first": "$creation_date"},
                "last_activity_date": {"$first": "$last_activity_date"},
                "majority": { "$first": "$majority" },
                "knw_labels" : { "$first": "$knw_labels"},
                "proposals": {"$first": "$proposals"},
                "contributors": {"$first": "$contributors"},
                "users": {"$push": "$users"},
                    "combinedKNW": { 
                    "$sum": { "$sum": "$users.knw_tokens.balance" } 
                }
                }
            }
        ]
        return stages;
        
    }
}

module.exports = mdlRepositories;