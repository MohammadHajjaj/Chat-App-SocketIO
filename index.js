const express = require('express')
const app = express();
const Filter = require('bad-words')
const path = require('path')
// we need to do this to work with socket.io
const http = require('http')
const server = http.createServer(app) // because we need to pass it to socketio , default express does this but we can't pass it
const socketio = require('socket.io')
const io = socketio(server) // this also sets up a file called socket.io.js in a file called socket.io that we have to serve , which is a library that has some functions we can use
const port = process.env.PORT || 3000
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


app.use(express.static(path.join(__dirname, './public')))

// counter example
//let count = 0

// io.on('connection', (socket) => {
//     console.log('New WebSocket Connection')
//     socket.emit('countUpdated', count) // emits a new event to the clients , what ever comes after the event name will be availabe to the client
//     //listenting to add from the client, now we add to count and send back the result 
//     socket.on('add', () => {
//         count++
//         //socket.emit('countUpdated', count) // emits the event to a single connection(socket)
//         io.emit('countUpdated', count) // emites the event too all connections
//     })
// })

io.on('connection', (socket) => { //io.on is only used with connection event
    console.log('new connection')
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })
        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) // broadcast means that it will emit the message to everyone BUT the current client
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
        // emit.to(room) , emit.broardcast.to(room) will emit the message to the clients who are in the current room

    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })
    socket.on('disconnect', () => { // built in event 
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

})



server.listen(port, () => {
    console.log(`Listening to port ${port}`)
})