const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
var bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
var cors = require('cors')
const app = express();

app.use(cors())
app.use(express.json());
app.get('/products/:id', function (req, res, next) {
  res.json({msg: 'This is CORS-enabled for all origins!'})
})
 
app.listen(80, function () {
  console.log('CORS-enabled web server listening on port 80')
})
async function main() {
  try {
    await mongoose.connect(
      "mongodb+srv://ongtrandong2:dongdong2@uitheater.h9f5vua.mongodb.net/?retryWrites=true&w=majority"
    );
    console.log("connected to db");
  } catch (error) {
    console.error(error);
  }
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const userModel = mongoose.model("user", userSchema);

app.listen(process.env.PORT || 3000, () => {
  console.log("server started");
});

app.post("/register", async (req, res) => {
  let { email, password, ...rest } = req.body;
  try {
    password = bcrypt.hashSync(password, 10);
    const user = new userModel({ email, password });
    await user.save();
    res.send("success register");
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/sign_in", async (req, res) => {
  const { email, password, ...rest } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      res.sendStatus(404);
      return;
    }
    if (!bcrypt.compareSync(password, user.password)) {
      res.sendStatus(401);
      return;
    } else {
      const token = jwt.sign(
        {
          email,
        },
        "UITLoGachNho"
      );
      res.send(token);
      return;
    }
  } catch (error) {}
});

async function authenticationMiddleware(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "UITLoGachNho");
    const { email } = decoded;
    const user = await userModel.findOne({ email });
    if (user) {
      req.email = email;
      next();
    }
  } catch (error) {
    res.sendStatus(401);
  }
}

app.get("/hello", authenticationMiddleware, (req, res) => {
  const email = req.email;
  res.send(`Hello ${email}`);
});

main();
