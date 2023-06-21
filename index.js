const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 2000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

//middleware:
app.use(cors());
app.use(express.json());

// JWT processor----------------------->>>>>>
// const verifyJWT = (req, res, next) => {

// }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wndd9z6.mongodb.net/?retryWrites=true&w=majority`;

// Creating a MongoClient with a MongoClientOptions object:
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db('brmmm').collection('users');
    const productCollection = client.db('brmmm').collection('products');

    // JWT configuration----------------------->>>>>>
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d',
      });
      res.send(token);
    });

    // User based APIs:
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user?.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists!' });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Get products---------------------------->>>>>>
    app.get('/products', async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    //------------------------------------------>>>>>
    //Sending a ping to confirm successful connection:
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    //
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('brmmm running...');
});

app.listen(port, () => {
  console.log('brmmm running on track:', port);
});
