const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
var cors = require("cors");
const e = require("express");
const app = express();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

const mailTransport = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    // service: "gmail",
    auth: {
      user: process.env.MAILTRAN_USERNAME,
      pass: process.env.MAILTRAN_PASSWORD,
    },
  });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.get("/products/:id", function (req, res, next) {
  res.json({ msg: "This is CORS-enabled for all origins!" });
});
const JWT_SECRET = process.env.JWT_SECRET;
app.listen(80, function () {
  console.log("CORS-enabled web server listening on port 80");
});


async function main() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URL
    );
    console.log("connected to db");
  } catch (error) {
    console.error(error);
  }
}

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  date: String,
  gender: String,
  phone: String,
});

const userModel = mongoose.model("user", userSchema);

app.listen(process.env.PORT || 3000, () => {
  console.log("server started");
});

app.post("/register", async (req, res) => {
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    return res.status(400).send("Email already exists"); 
  }
  let { name, email, password, date, gender, ...rest } = req.body;
  try {
    password = bcrypt.hashSync(password, 10);
    const user = new userModel({ name, email, password, date, gender });
    await user.save();
    res.send("success register");
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/sign_in", async (req, res) => {
  
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email }).lean();
    if (!user) {
      res.sendStatus(404);
      return;
    }
    if (!bcrypt.compareSync(password, user.password)) {
      res.sendStatus(401);
      return;
    } else {
      const { password, ...rest } = user;
      const token = jwt.sign(rest, JWT_SECRET);
      res.send(token);
      return;
    }
  } catch (error) {}
});

async function JWTauthenticationMiddleware(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "UITLoGachNho");
    const { name, email } = decoded;
    const user = await userModel.findOne({ email });
    console.log(decoded);
    if (user) {
      req.user = user;

      next();
    }
  } catch (error) {
    res.sendStatus(401);
  }
}

app.get("/me", JWTauthenticationMiddleware, (req, res) => {
  const { _id,name,email,date,gender,phone } = req.user;
  const user = { _id,name,email,date,gender,phone }
  res.send(user);
});

app.patch("/me/password", JWTauthenticationMiddleware, async (req, res) => {
  const { email, password, newPassword } = req.body;
  const user = await userModel.findOne({ email }).lean();
  if (!user) {
    return res.status(404).send("User not found");
  }
  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).send("Invalid password");
  }
  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await userModel.updateOne({ email }, { password: hashedPassword });
    await session.commitTransaction();
    const { password, ...rest } = user;
    const token = jwt.sign(rest, "UITLoGachNho");
    res.send({ token });
  } catch (error) {
    // Abort and rollback transaction on error
    await session.abortTransaction();
    res.status(500).send("Error updating password");
  } finally {
    session.endSession();
  }
});
app.patch("/me/info", JWTauthenticationMiddleware, async (req, res) => {
  // Lấy dữ liệu cần update từ body
  const { name,email,date,gender,phone } = req.body;
  const user = await userModel.findOne({ email }).lean();
  try {  
    // Cập nhật tên mới
    user.name = name;
    user.email = email;
    user.date = date;
    user.gender = gender;
    user.phone = phone;

    await userModel.updateMany({ email }, user);
    res.json(user);  

} catch(err) {

// User không tồn tại
if(!user) {
return res.status(404).json({message: 'User not found'});
}

// Lỗi kết nối db
res.status(500).json({message: err.message});
} 
});

//Change password and reset password

app.get("/forgot_password", async (req, res) => {
  res.render("forgot_password");
});

app.post("/forgot_password", async (req, res) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email }).lean();
  if (!user) {
    return res.status(404).send("User not found");
  }
  const secret = JWT_SECRET + user.password;
  const payload = {
    email: user.email,
    id: user._id,
  };
  const token = jwt.sign(payload, secret, { expiresIn: "15m" });
  const link = `http://localhost:3000/resetpassword/${user._id}/${token}`;
  mailTransport().sendMail({
    from: process.env.MAILTRAN_USERNAME,
    to: user.email,
    subject: "Reset password",
    html: `<h2>Please click on given link to reset your password</h2>
        <a href="${link}">${link}</a>`,
  });
  console.log(link);
  res.send("success");
});

app.get("/reset_password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const _id = id;
  const user = await userModel.findOne({ _id }).lean();
  if (!user) {
    return res.status(404).send("User not found");
  }
  
  const secret = JWT_SECRET + user.password;
  try {
    const payload = jwt.verify(token, secret);
    res.render("reset_password", { email: user.email });
  } catch (error) {
    console.log(error.message);
    res.sendStatus(error.message);
  }
});

app.post("/reset_password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const {password,password2} = req.body;
  const _id = id;
  const user = await userModel.findOne({ _id }).lean();
  if (!user) {
    return res.status(404).send("User not found");
  }
  const secret = JWT_SECRET + user.password;
  try {
    const payload = jwt.verify(token, secret);
    user.password = password;
    const hashedPassword = bcrypt.hashSync(password, 10);
    await userModel.updateOne({ _id }, { password: hashedPassword });
    res.send(user);
  } catch (error) {
    console.log(error.message);
    res.send(error.message)
  }

});


main();