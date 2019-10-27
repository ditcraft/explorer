var express = require('express');
var router = express.Router();
var contr_proposals = require('../controllers/contr_proposals'); 

/* GET home page. */
router.get('/', function(req, res, next) {
  contr_proposals.getProposals(req.cookies.mode, null, null, function(error, proposals){
    console.log('proposals: ', proposals);
    res.render('proposals', { user: req.user, proposals: proposals });
  });
});

module.exports = router;