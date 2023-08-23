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
const io = new Server(httpServer, { cors: true });

const port = process.env.PORT || 8000;
httpServer.listen(port, () => {
  console.log("Socket Server is running on port 8000");
});

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

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

const users = [{}];
async function run() {
  try {
    await client.connect();

    // ------------------------------------
    // Galaxy collection
    // ------------------------------------
    const usersCollection = client.db("galaxyMeeting").collection("users");
    const messagesCollection = client
      .db("galaxyMeeting")
      .collection("messages");

    // Inside your socket.io connection event handler
    io.on("connection", (socket) => {
      console.log("New Connection");

      socket.on("joined", ({ user }) => {
        users[socket.id] = user;
        console.log(`${user} has joined `);
        socket.broadcast.emit("userJoined", {
          user: "Admin",
          message: ` ${users[socket.id]} has joined`,
        });
        socket.emit("welcome", {
          user: "Admin",
          message: `Welcome to the chat,${users[socket.id]} `,
        });
      });

      socket.on("message", ({ message, id }) => {
        io.emit("sendMessage", { user: users[id], message, id });
      });

      socket.on("disconnect", () => {
        socket.broadcast.emit("leave", {
          user: "Admin",
          message: `${users[socket.id]}  has left`,
        });
        console.log(`user left`);
      });
    });

    // API endpoint to fetch chat history
    app.get("/chat/history", async (req, res) => {
      try {
        const history = await messagesCollection.find().toArray();
        res.send({ messages: history });
      } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // User related API
    app.get("/all-users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

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

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
