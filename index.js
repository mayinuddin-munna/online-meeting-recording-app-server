const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Verify JWT

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: "Unauthorized access!" });
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {

    if (error) {
      return res.status(403).send({ error: "Unauthorized access!" })
    }

    req.decoded = decoded;
    next();
  })
}

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
