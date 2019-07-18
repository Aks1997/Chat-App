const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router()

const User = require('../models/user');
const Room = require('../models/room');

mongoose.connect('mongodb://localhost:27017/chatroom',{
    useNewUrlParser: true
});

mongoose.Promise = global.Promise;

const saltRounds = 10;

class user{
    createRoom(id, name, room, password, socket, type){

        Room.countDocuments({name: room}, (err, count)=>{
            if(count>0){
                console.log("Room Already Exists");
                socket.emit('roomCreationStatus', {message: `Room ${room} already exist`, status: false, type: type});
                return false;
            }
            this.saveRoom(id, name, room, password, socket, type);
        });
    }

    saveRoom(id, name, room, password, socket, type){
        bcrypt.hash(password, saltRounds, (err, hash)=>{
            if(err){
                console.log('Error', err);
                socket.emit('roomCreationStatus', {message: err, status: false, type: type});
                return;
            }
            var chatroom = new Room({
                _id: new mongoose.Types.ObjectId(),
                name: room,
                password: hash
            });
            chatroom.save()
                .then(res=>{
                    console.log('Room Saved', res);
                    this.saveUser(id, name, room, password, socket, type);
                    return {id: id, name: name, room: room};
                })
                .catch(err=>{
                    console.log('Room Saving Error', err);
                    socket.emit('roomCreationStatus', {message: err, status: false, type: type});
                })
        }) 
    }

    saveUser(id, name, room, password, socket, type){
        Room.findOne({name: room})
            .exec()
            .then(result=>{
                if(!result){
                    console.log('No Room Exist');
                    socket.emit('roomCreationStatus', {message: `Room ${room} Doesn't exist`, status: false, type: type});
                    return;
                }
                bcrypt.compare(password, result.password, (err, res)=>{
                    if(res==true){
                        const user = new User({
                            _id: new mongoose.Types.ObjectId(),
                            id: id,
                            name: name,
                            room: result._id
                        });
                        user.save()
                            .then(res=>{
                                Room.updateOne({_id: result._id}, {$push: {users: res._id}})
                                    .exec()
                                    .then(r=>{
                                        console.log('Room Updated');
                                        socket.join(room);
                                        socket.emit('roomCreationStatus', {_id: res._id, id: id, name: name, room: room, status: true, type: type});
                                    })
                                    .catch(err=>{
                                        console.log('Error', err);
                                        socket.emit('roomCreationStatus', {message: err, status: false, type: type});
                                    })
                            })
                            .catch(err=>{
                                console.log('Error while saving user');
                                socket.emit('roomCreationStatus', {message: err, status: false, type: type});
                            })
                    }
                    else{
                        console.log('Incorrect Password');
                        socket.emit('roomCreationStatus', {message: 'Incorrect Password', status: false, type: type});
                    }
                });
            })
    }

    getUser(_id){
        return User.findById({_id})
            .populate('room')
            .exec();
    }

    getUserBySocket(id){
        return User.findOne({id: id})
            .populate('room')
            .exec();
    }

    removeUser(_id, socket){
        User.findOne({_id: _id})
            .populate('room')
            .exec()
            .then(result=>{
                const user_id = result._id;
                const room_id = result.room._id;
                const room_name = result.room.name;
                const r = result;
                const len = result.room.users.length;
                User.deleteOne({_id: _id})
                    .exec()
                    .then(res=>{
                        console.log(res);
                        Room.updateOne({_id: room_id}, {$pull: {users: user_id}})
                            .exec()
                            .then(p=>{
                                socket.leave(room_name);
                                if(r && len===1){
                                    this.deleteRoom(result.room._id);
                                }
                            })
                            .catch(err=>{
                                console.log(err);
                            })
                    })
                    .catch(err=>{
                        console.log(err);
                    })
            })
            .catch(err=>{
                console.log(err);
            })
    }

    deleteRoom(_id){
        Room.deleteOne({_id: _id})
            .exec()
            .then(res=>{
                console.log(res);
            })
            .catch(err=>{
                console.log(err);
            })
    }
}

router.get('/' ,(req, res, next)=>{
    Room.find({})
        .select("name users _id")
        .exec()
        .then(result=>{
            console.log(result);
            res.status(200).json(result);
        })
        .catch(err=>{
            res.status(500).json({message: `Error ${err}`});
        })
});

module.exports = {user,router};