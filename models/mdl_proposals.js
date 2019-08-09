var mdlProposals = {
    queryAllProposals: function(mode) {
        var stages = [
                // Stage 1
                {
                    $lookup: // Equality Match
                    {
                        from: "users_" + mode,
                        localField: "proposer",
                        foreignField: "address",
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
                }
        ]
        return stages;
    }
}

module.exports = mdlProposals;