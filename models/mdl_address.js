var mdlAddress = {
    querySingleAddress: function(mode, eth_address) {
        var stages = [
            {
                $match: {
                    address: eth_address
                }
            },
            // Stage 1
            {
                $lookup: // Equality Match
                {
                    from: "proposals_" + mode,
                    localField: "address",
                    foreignField: "proposer",
                    as: "proposals"
                }
            },
    
            // Stage 2
            {
                $lookup: // Equality Match
                {
                    from: "repositories_" + mode,
                    localField: "repository",
                    foreignField: "hash",
                    as: "repository"
                }
            },

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

            {
                $group: {
                "_id": "$_id",
                "address": { "$first": "$address" },
                "twitter_handle":  { "$first": "$twitter_handle" },
                "twitter_id":  { "$first": "$twitter_id" },
                "xdai_balance":  { "$first":"$xdai_balance"},
                "xdit_balance": { "$first": "$xdit_balance"},
                "knw_tokens": {"$first": "$knw_tokens"},
                "proposals": {"$push": "$proposals"},
                "repositories": {"$first": "$repositories"},
                "totalKNW": { 
                    "$sum": {"$sum": "$knw_tokens.balance"}
                    }
                }
            },
            {
                $project: {
                        "_id": 1,
                        "address": 1,
                        "twitter_handle": 1,
                        "twitter_id": 1,
                        "xdai_balance": 1,
                        "xdit_balance": 1,
                        "knw_tokens": 1,
                        "proposals": 1,
                        "repositories": 1,
                        "totalKNW": { 
                            "$sum": {"$sum": "$knw_tokens.balance"}
                            }             
                }
            }
        ]
        return stages;
    }
}

module.exports = mdlAddress;