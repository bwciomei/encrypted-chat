const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  require('dotenv').config();
}

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const { Pool } = require('pg')
const pool = new Pool()
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL
  },
  async function(accessToken, refreshToken, profile, cb) {
    const res = await pool.query(`INSERT INTO users (google_id, display_name, picture, email)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (google_id)
    DO UPDATE SET display_name=$2, picture=$3, email=$4
    RETURNING user_id;`,
    [profile.id, profile.displayName, profile._json.picture, null])
    return cb(null, res.rows[0].user_id);
  }));

passport.serializeUser(function(userId, cb) {
    cb(null, userId);
});

passport.deserializeUser(async function(userId, cb) {
    const res = await pool.query(`SELECT user_id, google_id, display_name, picture, email FROM users WHERE user_id=$1`,
    [userId]);
    cb(null, res.rows[0]);
});
  


var session = require('express-session');
var RedisStore = require('connect-redis')(session);

function ensureLoggedIn(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    if (req.session) {
      req.session.returnTo = req.originalUrl || req.url;
    }
    return res.redirect('/auth/google');
  }
  next();
}

app.use(session({
    store: new RedisStore({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }),
    secret: process.env.EXPRESS_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: isProd
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/loggedInTest', ensureLoggedIn, (req, res) => {
  res.send('logged in!');
});

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});