var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var TwitterStrategy   = require('passport-twitter').Strategy;
var sess              = require('express-session');
var BetterMemoryStore = require('session-memory-store')(sess);
const config = require('./config');

var indexRouter = require('./routes/index');
var addressRouter = require('./routes/address');
var contr_address = require('./controllers/contr_address');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var proposalsRouter = require('./routes/proposals');
var repositoriesRouter = require('./routes/repositories');

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

var app = express();
app.locals.moment = require('moment');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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