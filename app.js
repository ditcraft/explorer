var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var TwitterStrategy   = require('passport-twitter').Strategy;
var GitHubStrategy   = require('passport-github2').Strategy;
var GitLabStrategy   = require('passport-gitlab2').Strategy;
var BitbucketStrategy   = require('passport-bitbucket-oauth2').Strategy;
var sess              = require('express-session');
var BetterMemoryStore = require('session-memory-store')(sess);
const config = require('./config');


var indexRouter = require('./routes/index');
var addressRouter = require('./routes/address');
var contr_address = require('./controllers/contr_address');
var contr_repositories = require('./controllers/contr_repositories');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var proposalsRouter = require('./routes/proposals');
var repositoriesRouter = require('./routes/repositories');
var startRouter = require('./routes/start');

passport.use(new TwitterStrategy({
  consumerKey:    config.TWITTER_API_KEY,
  consumerSecret: config.TWITTER_API_SECRET,
  callbackURL:    config.TWITTER_CALLBACK_URL
},
  function(token, tokenSecret, profile, done) {
    contr_address.getAddressByTwitterID(profile.id, function(err, result){
      if(result){
        profile.eth_address = result.eth_address;
        done(null, profile);
      } else {
        done(null, null);
      }
    });
  }
));

// Serialize and deserialize user information
passport.serializeUser(function(user, callback){
  callback(null, user);
});
passport.deserializeUser(function(object, callback){
  callback(null, object);
});

passport.use(new GitHubStrategy({
  clientID: config.GITHUB_API_KEY,
  clientSecret: config.GITHUB_API_SECRET,
  callbackURL: config.GITHUB_CALLBACK_URL,
  passReqToCallback: true
},
  function(req, accessToken, refreshToken, profile, done) {
    if(req.user && req.user.provider === 'twitter'){
      req.user.gitToken = accessToken;
      done(null, req.user);
    } else {
      profile.gitToken = accessToken;
      done(null, profile);
    }
  }
));

passport.use(new GitLabStrategy({
  clientID: config.GITLAB_API_KEY,
  clientSecret: config.GITLAB_API_SECRET,
  callbackURL: config.GITLAB_CALLBACK_URL,
  passReqToCallback: true
},
  function(req, accessToken, refreshToken, profile, done) {    
    if(req.user && req.user.provider === 'twitter'){
      req.user.labToken = accessToken;
      done(null, req.user);
    } else {
      profile.labToken = accessToken;
      done(null, profile);
    }
  }
));

passport.use(new BitbucketStrategy({
  clientID: config.BITBUCKET_API_KEY,
  clientSecret: config.BITBUCKET_API_SECRET,
  callbackURL: config.BITBUCKET_CALLBACK_URL,
  passReqToCallback: true
},
  function(req, accessToken, refreshToken, profile, done) {    
    if(req.user && req.user.provider === 'twitter'){
      req.user.bucketToken = accessToken;
      req.user.bucketUser = profile.username;
      done(null, req.user);
    } else {
      profile.bucketToken = accessToken;
      profile.bucketUser = profile.username;
      done(null, profile);
    }
  }
));

var app = express();
app.locals.moment = require('moment');
app.locals.identicon = require('identicon.js');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 86400000 }));

/* add session cofig */
var store = new BetterMemoryStore({ expires: 60 * 60 * 1000, debug: true });
app.use(sess({
  name: 'JSESSION',
  secret: config.JSESSION_SECRET,
  store:  store,
  resave: true,
  saveUninitialized: true,
  cookie : { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/address', addressRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/proposals', proposalsRouter);
app.use('/repositories', repositoriesRouter);
app.use('/start', startRouter);

app.get('/toggleMode',function(req, res){
  if(req.cookies.mode && req.cookies.mode === "demo"){
    res.cookie("mode" , "live", {maxAge : 9999}).send("live");
  } else if(req.cookies.mode && req.cookies.mode === "live") {
    res.cookie("mode" , "demo", {maxAge : 9999}).send("demo");
  } else if(!req.cookies.mode){
    res.cookie("mode" , "demo", {maxAge : 9999}).send("demo");
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;