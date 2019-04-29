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
    return res.status(401).send('Not Authenticated');
    //return res.redirect('/auth/google');
  }
  next();
}

if (!isProd) {
  app.use(require('cors')({
    origin: 'http://localhost:8080',
    methods: ['GET','POST', 'PUT'],
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

app.use(require('body-parser').json() );
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const SOCKET_CONNECTIONS = "socket_connections";
const SOCKET_CONNECTS_BY_USER = "socket_connections_usr";
const CONNECTED = 'CONNECTED';
const DISCONNECTED = 'DISCONNECTED';

// We've restarted. Remove the open connections since they'll trigger a connected again anyway
redisClient.del(SOCKET_CONNECTIONS);
redisClient.del(SOCKET_CONNECTS_BY_USER);

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

app.get('/settings', async function(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.json({});
  } else {
      const keyQuery = await pool.query('SELECT key_guid, public_key FROM keys WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.user.user_id]);

      const key = keyQuery.rows.length > 0 ? keyQuery.rows[0] : null;
        res.json({
        user: _.pick(req.user, ['user_id', 'display_name', 'picture']),
        publicKey: key
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

app.get('/conversations', ensureLoggedIn, async (req, res) => {
  const result = await pool.query(`SELECT from_user_id, message, display_name, picture FROM (
    SELECT from_user_id, message, row_number() OVER (PARTITION BY from_user_id ORDER BY sent_timestamp DESC) FROM messages
    WHERE to_user_id=$1) latest_messages
    INNER JOIN users
    ON users.user_id=latest_messages.from_user_id
    WHERE row_number=1`, [req.user.user_id]);

    res.json(result.rows);
})

app.get('/messages/:userId', ensureLoggedIn, async (req, res) => {
  const messages = pool.query(`SELECT message_id, from_user_id, to_user_id, sent_timestamp, 
                    received_timestamp, message, to_key_guid, from_message, from_key_guid
                    FROM messages WHERE (from_user_id=$1 AND to_user_id=$2) OR (to_user_id=$1 AND from_user_id=$2)`,
                    [req.params.userId, req.user.user_id]);

  const userData = pool.query('SELECT user_id, display_name, picture FROM users WHERE user_id = ANY($1::int[])', 
    [[req.params.userId, req.user.user_id]]);

  const result = await Promise.all([messages, userData]);
  res.json({
    messages: result[0].rows,
    userData: result[1].rows
  });
});

app.post('/messages/:userId', ensureLoggedIn, async (req, res) => {
  const {message, keyGuid, fromMessage, fromKeyGuid} = req.body;
  const inserted = await pool.query(`INSERT INTO messages (from_user_id, to_user_id, sent_timestamp, received_timestamp, message, to_key_guid, from_message, from_key_guid)
  VALUES ($1, $2, NOW(), NOW(), $3, $4, $5, $6)
  RETURNING message_id, from_user_id, to_user_id, sent_timestamp, message, to_key_guid, from_message, from_key_guid`, 
  [req.user.user_id, req.params.userId, message, keyGuid, fromMessage, fromKeyGuid]);
  
  redisClient.publish('MESSAGE_RECEIVED', JSON.stringify(inserted.rows[0]), function() {
    var ass = arguments;
  });
  res.end();
})

app.put('/public-keys', ensureLoggedIn, async (req, res) => {
    await pool.query('INSERT INTO keys (key_guid, user_id, public_key) values ($1, $2, $3)',
    [req.body.uuid, req.user.user_id, req.body.key]);
    res.end();
})

app.get('/public-keys/:userId', ensureLoggedIn, async (req, res) => {
    const keyQuery = await pool.query('SELECT key_guid, public_key FROM keys WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
    [req.params.userId]);

    const key = keyQuery.rows.length > 0 ? keyQuery.rows[0] : null;

    res.json({
        key
    });
})

io.use(function(socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', async function(socket){
  const session = socket.request.session;
  console.log(`${session.passport.user} connected`);
  redisClient.hset(SOCKET_CONNECTIONS, socket.id, session.passport.user, redis.print);
  redisClient.hset(`${SOCKET_CONNECTS_BY_USER}:${session.passport.user}`, socket.id, 1, redis.print);

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
    redisClient.hdel(`${SOCKET_CONNECTS_BY_USER}:${session.passport.user}`, socket.id, redis.print);
  
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
  } else if (channel === 'MESSAGE_RECEIVED') {
    const data = JSON.parse(message);
    redisClient.hkeys(`${SOCKET_CONNECTS_BY_USER}:${data.to_user_id}`, (err, replies) => {
      const connected = io.sockets.connected;
      _.forEach(replies, r => {
        if (connected.hasOwnProperty(r)) {
          connected[r].emit("message_received", JSON.parse(message));
        }
      })
    })

  }
});

connectionListener.subscribe("CONNECTION_CHANGED");
connectionListener.subscribe("MESSAGE_RECEIVED");

http.listen(3000, function(){
  console.log('listening on *:3000');
});