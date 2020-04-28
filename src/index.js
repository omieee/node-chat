const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const FilterWords = require('bad-words')
const { generateMessageBody, generateLocationMessageBody } = require('./utils/messages')
const { addUser, getUser, getUsersInRoom, removeUser } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = 3000

const staticpath = path.join(__dirname, '../public')

app.use(express.static(staticpath))

const welcomemsg = "Welcome to twicahut"

io.on('connection', (socket) => {
    console.log("New Websocket connected!!!")
    socket.on('join', ({ username, roomname }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, roomname })
        if (error) {
            return callback(error)
        }
        socket.join(user.roomname)
        //Registering events
        /*
        This one will go to only that user
        */
        socket.emit('message', generateMessageBody('TwicaBOT', welcomemsg))
        /*
        This one will go to all other user other that the user itself
        */
        socket.broadcast.to(user.roomname).emit('message', generateMessageBody("TwicaBOT", user.username + " joined room"))
        io.to(user.roomname).emit('userlist', {
            roomname: user.roomname,
            members: getUsersInRoom(user.roomname)
        })
        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        filter = new FilterWords()
        if (filter.isProfane(msg)) {
            return callback("Bad words are not allowed")
        }
        const user = getUser(socket.id)
        if (!user) {
            return callback("Unable to get user details")
        }
        io.to(user.roomname).emit('message', generateMessageBody(user.username, msg))
        callback()
    })

    socket.on('sharelocation', (latlng, callback) => {
        const user = getUser(socket.id)
        if (!user) {
            return callback("Unable to get user details")
        }
        io.to(user.roomname).emit('locationMessage', generateLocationMessageBody(user.username, `https://google.com/maps?q=${latlng.latitude},${latlng.longitude}`))
        callback()
    })

    /*
    *For Call
    */
    socket.on('message-for-video', function (message) {
        console.log('Client said: ', message);
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message-back', message);
    });
    socket.on('create_or_join', function(room) {
        console.log('Received request to create or join room ' + room);
        var clientsInRoom = io.sockets.adapter.rooms[room];
        var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        console.log('Room ' + room + ' now has ' + numClients + ' client(s)');
    
        if (numClients === 0) {
          socket.join(room);
          console.log('Client ID ' + socket.id + ' created room ' + room);
          socket.emit('created', room, socket.id);
    
        } else if (numClients === 1) {
          console.log('Client ID ' + socket.id + ' joined room ' + room);
          io.sockets.in(room).emit('join', room);
          socket.join(room);
          socket.emit('joined', room, socket.id);
          io.sockets.in(room).emit('ready');
        } else { // max two clients
          socket.emit('full', room);
        }
      });
      socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              socket.emit('ipaddr', details.address);
            }
          });
        }
      });
      socket.on('call-initiated', () => {
        socket.broadcast.to(user.roomname).emit('ring')
      })

    /*
    *On the user whe he / she disconnects
    */
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.roomname).emit('message', generateMessageBody('TwicaBOT', `${user.username} has left`))
            io.to(user.roomname).emit('userlist', {
                roomname: user.roomname,
                members: getUsersInRoom(user.roomname)
            })
        }
    })
})

server.listen(port, () => {
    console.log("Server is running on port: " + port)
}) 