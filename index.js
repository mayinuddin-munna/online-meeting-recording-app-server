const http = require("http");
const { Server } = require("socket.io");
const { v4: uuIdv4 } = require("uuid");
const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: true,
  // origin: "http://localhost:5173",
  // methods: ["GET", "POST"],
});

const port = process.env.PORT || 8000;

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
  const userId = socket.handshake.auth.userId;
  const photoURL = socket.handshake.auth.photoURL;

  if (!userId || !username || !photoURL) {
    return next(new Error("Invalid User!"));
  }

  socket.username = username;
  socket.userId = userId;
  socket.photoURL = photoURL;
  console.log('photoURL -->',photoURL);
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
      photoURL: socket.photoURL,
    });
  }

  // all user event
  socket.emit("users", users);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

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
  socket.on("new message", (message, time ) => {
    const newMessage = {
      username: socket.username,
      userId: socket.userId,
      photoURL: socket.photoURL,
      message,
      time,
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

// ------------------------------------
// MongoDB URI
// ------------------------------------
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

    // ------------------------------------
    // Galaxy collection
    // ------------------------------------
    const usersCollection = client.db("galaxyMeeting").collection("users");
    const reviewsCollection = client.db("galaxyMeeting").collection("reviews");
    const aboutUsCollection = client.db("galaxyMeeting").collection("aboutUs");
    const communitiesCollection = client
      .db("galaxyMeeting")
      .collection("communities");

    // User related API
    app.get("/all-users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: "Forbidden access" });
      }
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

    // review related API
    app.get("/get-review", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    app.post("/add-review", verifyJWT, async (req, res) => {
      const email = req.body.email;
      const review = req.body;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: "forbidden access" });
      }
      console.log(
        "email",
        email,
        "review",
        review,
        "decodedEmail",
        decodedEmail
      );
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // aboutUs related API
    app.get("/aboutUs", async (req, res) => {
      const result = await aboutUsCollection.find().toArray();
      res.send(result);
    });

    // communities related API
    app.get("/get-communities", async (req, res) => {
      const result = await communitiesCollection.find().toArray();
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

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
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

httpServer.listen(port, () => {
  console.log(`Socket Server is running on port ${port}`);
});
