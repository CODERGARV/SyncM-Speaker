const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidv4 } = require('uuid');
var bodyParser = require('body-parser');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const botName = 'SyncM Bot';

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

// for parsing application/json
app.use(bodyParser.json());
// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('homepage.ejs')
})

app.get('/:roomid', (req, res) => {
  console.log('IN THE ROOM NOW.')
  res.render('room', { roomid: req.params.roomid });
})

app.post('/createRoom', (req, res) => {
  const room = uuidv4();
  res.redirect(`/${room}`)
})

app.post('/joinRoom', (req, res) => {
  const room = req.body.roomid;
  res.redirect(`/${room}`)
})

io.on('connection', socket => {
  console.log("connected with io")
  socket.on('new-user', (room, name) => {
    const user = userJoin(socket.id, name, room);
    console.log(user);

    //joining user to room
    socket.join(room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to SyncM!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });

  // Runs when client disconnects
  socket.on('disconnect-btn', () => {
    
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
    app.get(`/${user.room}/`,(req,res)=>{
      res.render('homepage.ejs');
    })
  });

  socket.on('clientEvent', function (data) {
    console.log(data);
    const user = getCurrentUser(socket.id);
    io.sockets
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has played the song`)
      );
    io.sockets.to(user.room).emit('playonall', { msg: "playing on all client", id: data.id });
  });

  socket.on('clientEventPause', function (data) {
    console.log(data);
    const user = getCurrentUser(socket.id);
    io.sockets
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has paused the song`)
      );
    io.sockets.to(user.room).emit('pauseonall', { msg: "pausing on all client", id: data.id });
  });

})

server.listen(3000);