var mdlAddress = {
    querySingleAddress: function(mode, eth_address) {
        var stages = [
            {
                $match: {
                    dit_address: eth_address
                }
            },
            // Stage 1
            {
                $lookup: // Equality Match
                {
                    from: "proposals_" + mode,
                    localField: "dit_address",
                    foreignField: "proposer",
                    as: "proposals"
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
                    from: "users",
                    localField: "proposals.proposer",
                    foreignField: "dit_address",
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
                    "dit_address": { "$first": "$dit_address" },
                    "twitter_id":  { "$first": "$twitter_id" },
                    "github_id": { "$first": "$github_id" },
                    "main_account": { "$first": "$main_account" },
                    "xdai_balance":  { "$first":"$xdai_balance"},
                    "xdit_balance": { "$first": "$xdit_balance"},
                    "knw_tokens": {"$first": "$knw_tokens_" + mode},
                    "proposals": {"$push": "$proposals"},
                    "repositories": {"$first": "$repositories_" + mode},
                    "totalKNW": { 
                        "$sum": {"$sum": "$knw_tokens.balance"}
                        }
                }
            },
            {
                $project: {
                        "_id": 1,
                        "dit_address": 1,
                        "twitter_id": 1,
                        "github_id": 1,
                        "main_account": 1,
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