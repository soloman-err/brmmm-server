const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 2000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);

//middleware:
app.use(cors());
app.use(express.json());

// JWT processor----------------------->>>>>>
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: 'Invalid authorization!' });
  }

  // token:
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: 'Invalid authorization!' });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const cartCollection = client.db('brmmm').collection('carts');
    const paymentCollection = client.db('brmmm').collection('payments');

    // JWT configuration----------------------->>>>>>
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d',
      });
      res.send(token);
    });

    // Verify-Admin----------------------------->>>>>>
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res
          .status(403)
          .send({ error: true, message: 'Forbidden Access!' });
      }
      next();
    };

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

    // Admin APIs---------------------------------->>>>>>
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded?.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

    // Cart APIs----------------------------------->>>>>>
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded?.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: 'Forbidden Access!' });
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.delete('/carts', async (req, res) => {
      const result = await cartCollection.deleteMany();
      res.send(result);
    });

    // Create payment intent:
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'USD',
        payment_method_types: ['card'],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment APIs--------------------------->>>>>>
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {
        _id: {
          $in: payment.cartProducts.map((id) => new ObjectId(id)),
        },
      };
      const deletedResult = await cartCollection.deleteMany(query);

      res.send({ insertResult, deletedResult });
    });

    // Products APIs---------------------------->>>>>>
    app.get('/products', async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.post('/addProduct', async (req, res) => {
      const addedProduct = req.body;
      const result = await productCollection.insertOne(addedProduct);
      res.send(result);
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
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
