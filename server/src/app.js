const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  require('dotenv').config();
}

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const { Pool } = require('pg')
const pool = new Pool()
var redis = require("redis");
const getRedisClient = function() {
  return redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  });
}

const redisClient = getRedisClient();

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var _ = require('lodash');

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

if (!isProd) {
  app.use(require('cors')({
    origin: 'http://localhost:8080',
    methods: ['GET','POST'],
    credentials: true
  }));
}

const sessionMiddleware = session({
  store: new RedisStore({client: redisClient}),
  secret: process.env.EXPRESS_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: isProd
  }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const SOCKET_CONNECTIONS = "socket_connections";
const CONNECTED = 'CONNECTED';
const DISCONNECTED = 'DISCONNECTED';

// We've restarted. Remove the open connections since they'll trigger a connected again anyway
redisClient.del(SOCKET_CONNECTIONS);

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    if (isProd) {
      res.redirect('/');
    } else {
      res.redirect('http://localhost:8080');
    }
  });

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/settings', function(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.json({});
  } else {
    res.json({
      user: _.pick(req.user, ['display_name', 'picture'])
    })
  }
});

app.get('/who', async (req, res) => {
  redisClient.hvals(SOCKET_CONNECTIONS, async function (err, replies) {
    console.log(replies.length + " replies:");
    replies.forEach(function (reply, i) {
        console.log("    " + i + ": " + reply);
    });

    const result = await pool.query(`SELECT user_id, display_name, picture FROM users
    WHERE user_id = ANY($1::int[])`,[replies]);

    res.json(result.rows);
});
})

app.get('/loggedInTest', ensureLoggedIn, (req, res) => {
  res.send('logged in!');
});

io.use(function(socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', async function(socket){
  const session = socket.request.session;
  console.log(`${session.passport.user} connected`);
  redisClient.hset(SOCKET_CONNECTIONS, socket.id, session.passport.user, redis.print);

  const result = await pool.query(`SELECT user_id, display_name, picture FROM users
    WHERE user_id = $1`,[session.passport.user]);

  redisClient.publish("CONNECTION_CHANGED", JSON.stringify({
    action: CONNECTED,
    user: result.rows[0]
  }));

  socket.on('disconnect', function(){
    const session = socket.request.session;
    console.log(`${session.passport.user} disconnected`);
    redisClient.hdel(SOCKET_CONNECTIONS, socket.id, redis.print);
  
    redisClient.publish("CONNECTION_CHANGED", JSON.stringify({
      action: DISCONNECTED,
      user: {
        user_id: session.passport.user
    }
  }))
  });
});



// Push new connection info when we hear from redis
const connectionListener = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});


connectionListener.on("message", function (channel, message) {
  if (channel === "CONNECTION_CHANGED") {
    io.emit("CONNECTION_CHANGED", JSON.parse(message));
  }
});

connectionListener.subscribe("CONNECTION_CHANGED");

http.listen(3000, function(){
  console.log('listening on *:3000');
});