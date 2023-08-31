const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { roomHandler } = require("./room");

// --------------------------------
// Cross-origin resource sharing
// --------------------------------
const cors = require("cors");

// --------------------------------
require("dotenv").config();
const jwt = require("jsonwebtoken");
// --------------------------------

// Monogdb DATABASE
const { MongoClient, ServerApiVersion } = require("mongodb");

// Express app
const app = express();

// ------------------------------------
// Middleware
// ------------------------------------
app.use(cors);
app.use(express.json());

// ------------------------------------
// Port
// ------------------------------------
const port = process.env.PORT || 8000;

// ------------------------------------
// Create a socket.io server
// ------------------------------------
const httpServer = http.createServer(app);

// ------------------------------------
// Define socket.io with cors that help to client to server transition
// ------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ---------------------------------------
// Implement user connection for socket.io
// ------------------------------------
io.on("connection", (socket) => {
  console.log("a user connected");

  // Import room from room folder
  roomHandler(socket);

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// ---------------------------------------
// Basic request
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ------------------------------------
// Verify JWT
// ------------------------------------
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

    // User related API

    // TODO: add verifyJWT in the API
    app.get("/all-users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // TODO: add verifyJWT in the API
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

    // JWT related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res.send({ token });
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

// ------------------------------------
// I put server listen to bottom
// JS engine read synchronized
// Its help to debug better way
// ------------------------------------
httpServer.listen(port, () => {
  console.log("Socket Server is running on port 8000");
});
