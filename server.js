const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const {user} = require('./api/user/user');
const app = require('./app');

const chatUser = new user();

const publicPath = path.join(__dirname, 'public');

//app.use(express.static(publicPath));

const port = process.env.PORT || 4000;

const server = http.createServer(app);

const io = socketIO(server);

io.on('connection', (socket)=>{
    console.log(`${socket.id} connected`);

    var currUser = {};

    currUser.active = true;

    socket.on('createRoom', (data)=>{
        console.log("User Id",currUser._id);
        chatUser.removeUser(currUser._id, socket);
        chatUser.createRoom(socket.id, data.name, data.room, data.password, socket, "CREATE");
    });

    socket.on('joinRoom', (data)=>{
        console.log("User Id",currUser._id);
        chatUser.removeUser(currUser._id, socket);
        chatUser.saveUser(socket.id, data.name, data.room, data.password, socket, "JOIN");
    })

    //must be called from front end to give currUser details
    socket.on('setDetails', (data)=>{
        currUser = {
            _id: data._id,
            id: data.id,
            name: data.name,
            room: data.room
        }
    });

    socket.on('messageRecieved', (data)=>{
        socket.to(currUser.room).broadcast.emit('roomMessage', {
            from: currUser.name,
            message: data.message,
            time: new Date().getTime()
        });
    })

    socket.on('disconnect', ()=>{
        currUser.active = false;
        console.log(`${socket.id} disconnected`);
        setTimeout(()=>{
            if(!currUser.active)
                chatUser.removeUser(currUser._id, socket);
        }, 5000);
    });
});

server.listen(port);