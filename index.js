const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
var cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.get("/products/:id", function (req, res, next) {
  res.json({ msg: "This is CORS-enabled for all origins!" });
});

app.listen(80, function () {
  console.log("CORS-enabled web server listening on port 80");
});
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
      const token = jwt.sign(rest, "UITLoGachNho");
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

main();
// const express = require("express");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const connectToDatabase = require("./databases/db");
// const userModel = require("./models/user");
// const JWTauthenticationMiddleware = require("./controllers/authMiddleware");
// var cors = require("cors");

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Connect to the database
// connectToDatabase();
// app.get("/products/:id", function (req, res, next) {
//   res.json({ msg: "This is CORS-enabled for all origins!" });
// });

// app.listen(80, function () {
//   console.log("CORS-enabled web server listening on port 80");
// });

// app.listen(process.env.PORT || 3001, () => {
//   console.log("server started");
// });

// // Register route
// app.post("/register", async (req, res) => {
//     const existingUser = await userModel.findOne({ email });
//     if (existingUser) {
//       return res.status(400).send("Email already exists"); 
//     }
//     let { name, email, password, date, gender, ...rest } = req.body;
//     try {
//       password = bcrypt.hashSync(password, 10);
//       const user = new userModel({ name, email, password, date, gender });
//       await user.save();
//       res.send("success register");
//     } catch (error) {
//       console.error(error);
//       res.sendStatus(500);
//     }
// });

// // Sign-in route
// app.post("/sign_in", async (req, res) => {
//     const { email, password } = req.body;
//     try {
//         const user = await userModel.findOne({ email }).lean();
//         if (!user) {
//         res.sendStatus(404);
//         return;
//         }
//         if (!bcrypt.compareSync(password, user.password)) {
//         res.sendStatus(401);
//         return;
//         } else {
//         const { password, ...rest } = user;
//         const token = jwt.sign(rest, "UITLoGachNho");
//         res.send(token);
//         return;
//         }
//     } catch (error) {}
// });

// // Get user profile route
// app.get("/me", JWTauthenticationMiddleware, (req, res) => {
//     const { _id,name,email,date,gender } = req.user;
//     const user = { _id,name,email,date,gender }
//     res.send(user);
// });

// // Update password route
// app.patch("/me/password", JWTauthenticationMiddleware, async (req, res) => {
//     const { email, password, newPassword } = req.body;
//     const user = await userModel.findOne({ email }).lean();
//     if (!user) {
//       return res.status(404).send("User not found");
//     }
//     const isValid = bcrypt.compareSync(password, user.password);
//     if (!isValid) {
//       return res.status(401).send("Invalid password");
//     }
//     // Start transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const hashedPassword = bcrypt.hashSync(newPassword, 10);
//       await userModel.updateOne({ email }, { password: hashedPassword });
//       await session.commitTransaction();
//       const { password, ...rest } = user;
//       const token = jwt.sign(rest, "UITLoGachNho");
//       res.send({ token });
//     } catch (error) {
//       // Abort and rollback transaction on error
//       await session.abortTransaction();
//       res.status(500).send("Error updating password");
//     } finally {
//       session.endSession();
//     }
// });

// app.patch("/me/info", JWTauthenticationMiddleware, async (req, res) => {
//   // Lấy dữ liệu cần update từ body
//   const { name,email,date,gender,phone } = req.body;
//   const user = await userModel.findOne({ email }).lean();
//   try {  
//     // Cập nhật tên mới
//     user.name = name;
//     user.email = email;
//     user.date = date;
//     user.gender = gender;
//     user.phone = phone;

//     await userModel.updateMany({ email }, user);
//     res.json(user);  

// } catch(err) {

// // User không tồn tại
// if(!user) {
// return res.status(404).json({message: 'User not found'});
// }

// // Lỗi kết nối db
// res.status(500).json({message: err.message});
// } 
// });