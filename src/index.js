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

const port = process.env.PORT || 3000

const staticpath = path.join(__dirname, '../public')

app.use(express.static(staticpath))

const welcomemsg = "Welcome to twicahut"

io.on('connection', (socket) => {
    console.log("New Websocket connected!")
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
        socket.broadcast.to(user.roomname).emit('message', generateMessageBody("TwicaBOT",user.username + " joined room"))
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
    *On the user whe he / she disconnects
    */
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user) {
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