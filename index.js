const http = require("http");
const { Server } = require("socket.io");
const { v4: uuIdv4 } = require("uuid");
const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: true,
  // origin: "http://localhost:5173",
  // methods: ["GET", "POST"],
});

httpServer.listen(8000, () => {
  console.log("Socket Server is running on port 8000");
});

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
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
  for (let [id, socket] of io.of("/").sockets) {
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
    userId: socket.userId,
  });

  // new user event
  socket.broadcast.emit("user connected", {
    username: socket.username,
    userId: socket.userId,
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

// Verify JWT

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: "Unauthorized access!" });
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).send({ error: "Unauthorized access!" });
    }

    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.jkwo6ss.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Galaxy collection
    const usersCollection = client.db("galaxyMeeting").collection("users");
    const blogCollection = client.db("galaxyMeeting").collection("blogs");

    // User related API

    // TODO: add verifyJWT in the API
    app.get("/all-users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // TODO: add verifyJWT in the API
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      // if(email !== decodedEmail){
      //   return res.status(403).send({ error: 'forbidden access'})
      // }
      const query = { email: email };
      const result = await usersCollection.findOne(query);

      res.send(result);
    });

    app.post("/add-users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exist" });
      }

      console.log("user", user);

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // JWT related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res.send({ token });
    });

    // -----------------------------------------
    // Blog post
    // -----------------------------------------

    app.get("/blog", async (req, res) => {
      const posts = await blogCollection.find().toArray();

      res.send(posts);
    });

    // Endpoint to get details of a single blog post
    app.get("/blog/:id", async (req, res) => {
      try {
        const blogId = req.params.id;
        const post = await blogPosts.findOne({ _id: ObjectId(blogId) });

        if (!post) {
          return res.status(404).json({ message: "Blog post not found" });
        }

        res.status(200).json(post);
      } catch (error) {
        res.status(500).json({ message: "Error fetching blog post details." });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Online meeting recording app listening on port ${port}`);
});
