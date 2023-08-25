const http = require('http');
const { Server } = require('socket.io');
const { v4: uuIdv4 } = require('uuid');
const path = require("path");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

const env = process.env.NODE_ENV || "development";

// Redirect to https
app.get("*", (req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https" && env !== "development") {
    return res.redirect(["https://", req.get("Host"), req.url].join(""));
  }
  next();
});

// <----- Socket.io Start ---->
// handshake.auth <-- is used for user authentication

io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  // console.log('38-socket',socket);
  if (!username) {
    return next(new Error("Invalid User!"));
  }

  socket.username = username;
  socket.userId = uuIdv4();
  next();
});


io.on("connection", (socket) => {
  // socket events

  // all connected users
  const users = [];
  for (let [id, socket] of io.of('/').sockets) {
    users.push({
      userId: socket.userId,
      username: socket.username,
    });
  }

  // all user event
  socket.emit("users", users);

  // connected user details
  socket.emit("session", {
    username: socket.username,
    userId: socket.userId
  });

  // new user event
  socket.broadcast.emit("user connected", {
    username: socket.username,
    userId: socket.userId
  });

  // new message
  socket.on("new message", (message) => {
    const newMessage = {
      username: socket.username,
      userId: socket.userId,
      message,
    };

    socket.emit("new message", newMessage); // Emit to the sender
    socket.broadcast.emit("new message", newMessage); // Broadcast to others
  });

});

// <----- Socket.io ends ------>


app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "node_modules")));

const server = require("http").createServer(app);
server.listen(port, () => {
  console.log(`listening on port ${port}`);
});

/**
 * Socket.io events
 */
const io = socketIO(server);
io.sockets.on("connection", function (socket) {
  /**
   * Log actions to the client
   */
  function log() {
    const array = ["Server:"];
    array.push.apply(array, arguments);
    socket.emit("log", array);
  }

  /**
   * Handle message from a client
   * If toId is provided message will be sent ONLY to the client with that id
   * If toId is NOT provided and room IS provided message will be broadcast to that room
   * If NONE is provided message will be sent to all clients
   */
  socket.on("message", (message, toId = null, room = null) => {
    log("Client " + socket.id + " said: ", message);

    if (toId) {
      console.log("From ", socket.id, " to ", toId, message.type);

      io.to(toId).emit("message", message, socket.id);
    } else if (room) {
      console.log("From ", socket.id, " to room: ", room, message.type);

      socket.broadcast.to(room).emit("message", message, socket.id);
    } else {
      console.log("From ", socket.id, " to everyone ", message.type);

      socket.broadcast.emit("message", message, socket.id);
    }
  });

  let roomAdmin; // save admins socket id (will get overwritten if new room gets created)

  /**
   * When room gets created or someone joins it
   */
  socket.on("create or join", (room) => {
    log("Create or Join room: " + room);

    // Get number of clients in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    let numClients = clientsInRoom ? clientsInRoom.size : 0;

    // User related API

    // TODO: add verifyJWT in the API
    app.get('/all-users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    // TODO: add verifyJWT in the API
    app.get('/user/:email', async(req, res) =>{
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      // if(email !== decodedEmail){
      //   return res.status(403).send({ error: 'forbidden access'})
      // }
      const query = { email : email };
      const result = await usersCollection.findOne(query);
    
      res.send(result);

    })

    app.post('/add-users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query)

      if (existingUser) {
        return res.send({ message: "User already exist" })
      }

      console.log("user", user);

      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // JWT related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '10h'
      });
      res.send({ token });
    })

  /**
   * Kick participant from a call
   */
  socket.on("kickout", (socketId, room) => {
    if (socket.id === roomAdmin) {
      socket.broadcast.emit("kickout", socketId);
      io.sockets.sockets.get(socketId).leave(room);
    } else {
      console.log("not an admin");
    }
  });

  // participant leaves room
  socket.on("leave room", (room) => {
    socket.leave(room);
    socket.emit("left room", room);
    socket.broadcast.to(room).emit("message", { type: "leave" }, socket.id);
  });

  /**
   * When participant leaves notify other participants
   */
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      if (room === socket.id) return;
      socket.broadcast.to(room).emit("message", { type: "leave" }, socket.id);
    });
  });
});
