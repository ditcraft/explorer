var mdlProposals = {
    queryAllProposals: function(mode) {
        var stages = [
                // Stage 1
                {
                    $lookup: // Equality Match
                    {
                        from: "users",
                        localField: "proposer",
                        foreignField: "dit_address",
                        as: "proposer"
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
                    $sort: {
                        creation_date: -1
                    }
                }
        ]
        return stages;
    }
}

module.exports = mdlProposals;