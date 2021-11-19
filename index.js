const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const admin = require('firebase-admin');
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
app.use(cors());
app.use(express.json());
const uri = ` mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ksj3s.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const database = client.db('carcollection');
    console.log('database connected successfully');
    const OurCollection = database.collection('carcollection');
    const bookingsCollection = database.collection('bookings');
    const usersCollection = database.collection('users');
    console.log('collection connected successfully');
    app.get('/carcollection', async (req, res) => {
      const cursor = OurCollection.find({});
      // const count = await count.count();
      const carcollection = await cursor.toArray();
      res.send(carcollection);
    });
    //post api
    app.post('/carcollection', async (req, res) => {
      const carcollection = req.body;
      console.log('hit the post api', carcollection);
      const result = await OurCollection.insertOne(carcollection);
      console.log(result);
      res.send('post hitted');
    });

    // get single product
    app.get('/singleProduct/:id', async (req, res) => {
      const result = await OurCollection.find({
        _id: ObjectId(req.params.id),
      }).toArray();
      res.send(result[0]);
    });
    // cofirm order
    app.post('/confirmOrder', async (req, res) => {
      const result = await bookingsCollection.insertOne(req.body);
      res.send(result);
    });

    // my confirmOrder

    app.get('/myOrders/:email', async (req, res) => {
      const result = await bookingsCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });
    /// delete order

    app.delete('/delteOrder/:id', async (req, res) => {
      const result = await bookingsCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };

      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: 'you do not have access to make admin' });
      }
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at ${port}`);
});
