var Web3 = require('web3');
const BigNumber = require('bignumber.js');
var config = require('../config.json');
var contr_proposals = require('./contr_proposals');
var contr_address = require('./contr_address');
var passport = require('passport');
const Octokit = require('@octokit/rest');

const { oauthLoginUrl } = require('@octokit/oauth-login-url');

web3 = new Web3(new Web3.providers.WebsocketProvider('wss://node.ditcraft.io/ws') || new Web3.providers.WebsocketProvider('wss://dai-trace-ws.blockscout.com/ws'));

var coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);

var controller = {
    getRepositories: function(mode, id, details, callback){
        if(mode === "live"){
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
        } else if (mode === "demo") {
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
        }
        var repositories = [];
        coordinatorContract.getPastEvents('InitializeRepository', {
            filter: {repository: id},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, events) {
            if(error){
                console.error(error);
            } else {
                for(var i = 0; i < events.length; i++){
                    var repository = {
                        hex: events[i].returnValues.repository
                    };
                    await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(async function(result){
                        repository.name = result.name.replace(/^(github\.com\/)/,"");

                        await contr_proposals.getProposals(mode, null, events[i].returnValues.repository).then(async function(result){
                            
                            var countContributors = {};
                            var countLabels = {};

                            repository.contributors = [];
                            repository.labels = [];

                            for(var h = 0; h < result.length; h++){
                                countContributors[result[h].who] = (countContributors[result[h].who] || 0) + 1;
                                countLabels[result[h].label] = (countLabels[result[h].label] || 0) + 1;
                            }
                            repository.labels.push(countLabels);
                            repository.contributors.push(countContributors);

                            if(result && result.length) {
                                var latest = result.reduce(function (r, a) {
                                    return r.openEndDate > a.openEndDate ? r : a;
                                });
                                repository.topicality = latest.openEndDate;
                            }
                            
                            if(details){
                                repository.proposals = result;
                            }

                            for(var j = 0; j < repository.contributors.length; j++){
                                if(Object.keys(repository.contributors[j])[0]){
                                    await contr_address.getAddressTokens(mode, Object.keys(repository.contributors[j])[0]).then(async function(tokens){
                                        repository.contributors[j].KNW = sum(tokens).toFixed(2);
                                        await contr_address.getTwitterName(Object.keys(repository.contributors[j])[0]).then(async function(result){
                                            repository.contributors[j].twitter = result.twitter_screen_name;
                                            var total = 0;
                                            repository.contributors.forEach(item => {
                                                total += item.KNW;
                                            });
                                            
                                            repository.combinedKNW = total;
                                            await repositories.push(repository);
                                        });
                                    });
                                }

                            }
                            console.log('repository: ', repository);
                            console.log('result: ', result);
                        });
                    });
                }
                callback(repositories);
            }
        });
    },
    getAssociatedRepositories: function(mode, id, callback){
        if(mode === "live"){
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
        } else if (mode === "demo") {
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
        }
        var repositories = [];
        var repository = {};
        coordinatorContract.getPastEvents('InitializeRepository', {
            filter: {who: id},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, events) {
            if(error){
                console.error(error);
            } else {
                for(var i = 0; i < events.length; i++){
                    repository.hex = events[i].returnValues.repository;          
                    await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(async function(result){
                        repository.name = result.name.replace(/^(github\.com\/)/,"");
                        repositories.push(repository);
                    });
                }
                
                coordinatorContract.getPastEvents('ProposeCommit', {
                    filter: {who: id},
                    fromBlock: 0,
                    toBlock: 'latest'
                }, async function(error, events) {
                    if(error){
                        console.error(error);
                    } else {
                        for(var i = 0; i < events.length; i++){
                            repository.hex = events[i].returnValues.repository;
                            await coordinatorContract.methods.repositories(events[i].returnValues.repository).call().then(async function(result){
                                repository.name = result.name.replace(/^(github\.com\/)/,"");
                                repositories.push(repository);
                            });
                        }
                        callback(getUnique(repositories));
                    }
                });
            }
        });
    },
    createGithubRepository: function(name, accessToken, callback){
        var octokit = new Octokit({
            auth: accessToken
        });
        //callback();
        octokit.repos.createForAuthenticatedUser({
            name
        }).then(function (result){
            console.log('result: ', result);
            callback(null, result);
        }).catch(function (error){
            console.error(error);
            callback(error, null);
        });
        /*callback(null, { status: 201,
            url: 'https://api.github.com/user/repos',
            headers:
             { 'access-control-allow-origin': '*',
               'access-control-expose-headers':
                'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type',
               'cache-control': 'private, max-age=60, s-maxage=60',
               connection: 'close',
               'content-length': '4893',
               'content-security-policy': 'default-src \'none\'',
               'content-type': 'application/json; charset=utf-8',
               date: 'Tue, 09 Jul 2019 13:52:52 GMT',
               etag: '"11cd44a21ac76d4fe5d0501aef0d2319"',
               location: 'https://api.github.com/repos/yannikgold/gustav',
               'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
               server: 'GitHub.com',
               status: '201 Created',
               'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
               vary:
                'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding',
               'x-accepted-oauth-scopes': 'public_repo, repo',
               'x-content-type-options': 'nosniff',
               'x-frame-options': 'deny',
               'x-github-media-type': 'github.v3; format=json',
               'x-github-request-id': '3A98:35213:3CCEB6C:4BC2110:5D249C34',
               'x-oauth-client-id': '001fd9c03bd697f5ebf7',
               'x-oauth-scopes': 'repo',
               'x-ratelimit-limit': '5000',
               'x-ratelimit-remaining': '4998',
               'x-ratelimit-reset': '1562683971',
               'x-xss-protection': '1; mode=block' },
            data:
             { id: 196018659,
               node_id: 'MDEwOlJlcG9zaXRvcnkxOTYwMTg2NTk=',
               name: 'gustav',
               full_name: 'yannikgold/gustav',
               private: false,
               owner:
                { login: 'yannikgold',
                  id: 43583587,
                  node_id: 'MDQ6VXNlcjQzNTgzNTg3',
                  avatar_url: 'https://avatars3.githubusercontent.com/u/43583587?v=4',
                  gravatar_id: '',
                  url: 'https://api.github.com/users/yannikgold',
                  html_url: 'https://github.com/yannikgold',
                  followers_url: 'https://api.github.com/users/yannikgold/followers',
                  following_url:
                   'https://api.github.com/users/yannikgold/following{/other_user}',
                  gists_url: 'https://api.github.com/users/yannikgold/gists{/gist_id}',
                  starred_url:
                   'https://api.github.com/users/yannikgold/starred{/owner}{/repo}',
                  subscriptions_url: 'https://api.github.com/users/yannikgold/subscriptions',
                  organizations_url: 'https://api.github.com/users/yannikgold/orgs',
                  repos_url: 'https://api.github.com/users/yannikgold/repos',
                  events_url: 'https://api.github.com/users/yannikgold/events{/privacy}',
                  received_events_url: 'https://api.github.com/users/yannikgold/received_events',
                  type: 'User',
                  site_admin: false },
               html_url: 'https://github.com/yannikgold/gustav',
               description: null,
               fork: false,
               url: 'https://api.github.com/repos/yannikgold/gustav',
               forks_url: 'https://api.github.com/repos/yannikgold/gustav/forks',
               keys_url:
                'https://api.github.com/repos/yannikgold/gustav/keys{/key_id}',
               collaborators_url:
                'https://api.github.com/repos/yannikgold/gustav/collaborators{/collaborator}',
               teams_url: 'https://api.github.com/repos/yannikgold/gustav/teams',
               hooks_url: 'https://api.github.com/repos/yannikgold/gustav/hooks',
               issue_events_url:
                'https://api.github.com/repos/yannikgold/gustav/issues/events{/number}',
               events_url: 'https://api.github.com/repos/yannikgold/gustav/events',
               assignees_url:
                'https://api.github.com/repos/yannikgold/gustav/assignees{/user}',
               branches_url:
                'https://api.github.com/repos/yannikgold/gustav/branches{/branch}',
               tags_url: 'https://api.github.com/repos/yannikgold/gustav/tags',
               blobs_url:
                'https://api.github.com/repos/yannikgold/gustav/git/blobs{/sha}',
               git_tags_url:
                'https://api.github.com/repos/yannikgold/gustav/git/tags{/sha}',
               git_refs_url:
                'https://api.github.com/repos/yannikgold/gustav/git/refs{/sha}',
               trees_url:
                'https://api.github.com/repos/yannikgold/gustav/git/trees{/sha}',
               statuses_url:
                'https://api.github.com/repos/yannikgold/gustav/statuses/{sha}',
               languages_url: 'https://api.github.com/repos/yannikgold/gustav/languages',
               stargazers_url: 'https://api.github.com/repos/yannikgold/gustav/stargazers',
               contributors_url:
                'https://api.github.com/repos/yannikgold/gustav/contributors',
               subscribers_url: 'https://api.github.com/repos/yannikgold/gustav/subscribers',
               subscription_url:
                'https://api.github.com/repos/yannikgold/gustav/subscription',
               commits_url:
                'https://api.github.com/repos/yannikgold/gustav/commits{/sha}',
               git_commits_url:
                'https://api.github.com/repos/yannikgold/gustav/git/commits{/sha}',
               comments_url:
                'https://api.github.com/repos/yannikgold/gustav/comments{/number}',
               issue_comment_url:
                'https://api.github.com/repos/yannikgold/gustav/issues/comments{/number}',
               contents_url:
                'https://api.github.com/repos/yannikgold/gustav/contents/{+path}',
               compare_url:
                'https://api.github.com/repos/yannikgold/gustav/compare/{base}...{head}',
               merges_url: 'https://api.github.com/repos/yannikgold/gustav/merges',
               archive_url:
                'https://api.github.com/repos/yannikgold/gustav/{archive_format}{/ref}',
               downloads_url: 'https://api.github.com/repos/yannikgold/gustav/downloads',
               issues_url:
                'https://api.github.com/repos/yannikgold/gustav/issues{/number}',
               pulls_url:
                'https://api.github.com/repos/yannikgold/gustav/pulls{/number}',
               milestones_url:
                'https://api.github.com/repos/yannikgold/gustav/milestones{/number}',
               notifications_url:
                'https://api.github.com/repos/yannikgold/gustav/notifications{?since,all,participating}',
               labels_url:
                'https://api.github.com/repos/yannikgold/gustav/labels{/name}',
               releases_url:
                'https://api.github.com/repos/yannikgold/gustav/releases{/id}',
               deployments_url: 'https://api.github.com/repos/yannikgold/gustav/deployments',
               created_at: '2019-07-09T13:52:52Z',
               updated_at: '2019-07-09T13:52:52Z',
               pushed_at: '2019-07-09T13:52:52Z',
               git_url: 'git://github.com/yannikgold/gustav.git',
               ssh_url: 'git@github.com:yannikgold/gustav.git',
               clone_url: 'https://github.com/yannikgold/gustav.git',
               svn_url: 'https://github.com/yannikgold/gustav',
               homepage: null,
               size: 0,
               stargazers_count: 0,
               watchers_count: 0,
               language: null,
               has_issues: true,
               has_projects: true,
               has_downloads: true,
               has_wiki: true,
               has_pages: false,
               forks_count: 0,
               mirror_url: null,
               archived: false,
               disabled: false,
               open_issues_count: 0,
               license: null,
               forks: 0,
               open_issues: 0,
               watchers: 0,
               default_branch: 'master',
               permissions: { admin: true, push: true, pull: true },
               allow_squash_merge: true,
               allow_merge_commit: true,
               allow_rebase_merge: true,
               network_count: 0,
               subscribers_count: 0 } }
          );*/
    },
    checkRepoInit: async function(mode, name, callback){
        if(mode === "live"){
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_LIVE, config.CONTRACT.LIVE.ditCoordinator);
        } else if (mode === "demo") {
            coordinatorContract = new web3.eth.Contract(config.ABI.ditCoordinator_DEMO, config.CONTRACT.DEMO.ditCoordinator);
        }

        await coordinatorContract.events.InitializeRepository({
            filter: {},
            fromBlock: 0,
            toBlock: 'latest'
        }, async function(error, event){ 
            if(error){
                console.error(error);
            } else {
                var hex = event.returnValues.repository;
                await coordinatorContract.methods.repositories(hex).call().then(async function(result){
                    if(result.name + '.git' === name){
                        callback(hex, name);
                    } else {
                        callback(null);
                    }
                });
            };
        }).on('data', function(event){
            //console.log(event); // same results as the optional callback above
        }).on('changed', function(event){
            console.log('changed: ', event);
            // remove event from local database
        }).on('error', console.error);
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

function getUnique(arr, comp) {
    const unique = arr
         .map(e => e[comp])
      .map((e, i, final) => final.indexOf(e) === i && i)
      .filter(e => arr[e]).map(e => arr[e]);
  
     return unique;
}

module.exports = controller;