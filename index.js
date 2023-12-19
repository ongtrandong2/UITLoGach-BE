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

const hallSchema = new mongoose.Schema({
  id: Number,
  name: String,
});

const seatSchema = new mongoose.Schema({
  id: Number,
  hallId: Number,
  type: String,
  status: String,
});

const showtimeSchema = new mongoose.Schema({
  id: Number,
  movieId: Number,
  theaterId: Number,
  date: String,
  time: String,
});

const ticketSchema = new mongoose.Schema({
  id: Number,
  showtimeId: Number,
  seatId: Number,
  userId: String,
});

const theaterSchema = new mongoose.Schema({
  theaterId: String,
  name: String,
  address: String,
});


const avatarSchema = new mongoose.Schema({
  index: String,
  image: String,
});
const movieSchema = new mongoose.Schema({
  movieId: Number,
  name: String,
  image: String,
  description: String,
  showtime: String,
});

const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  email: String,
  password: String,
  date: String,
  gender: String,
  phone: String,
  spent: Number,
});

const historySchema = new mongoose.Schema({
  ticketId: Number,
  userId: mongoose.Schema.Types.ObjectId,
});

const avatarModel = mongoose.model("avatar", avatarSchema);
const movieModel = mongoose.model("movie", movieSchema);
const userModel = mongoose.model("user", userSchema);
const hallModel = mongoose.model("hall", hallSchema);
const seatModel = mongoose.model("seat", seatSchema);
const showtimeModel = mongoose.model("showtime", showtimeSchema);
const ticketModel = mongoose.model("ticket", ticketSchema);
const theaterModel = mongoose.model("theater", theaterSchema);
const historyModel = mongoose.model("history", historySchema);

app.listen(process.env.PORT || 3000, () => {
  console.log("server started");
});

//Avatar
app.get("/avatars", async (req, res) => {
  const avatars = await avatarModel.find();
  if (!avatars) {
    return res.status(404).send("Movie not found");
  }
  res.send(avatars);
});
app.get("/one_avatar", async (req, res) => {
  try {
    const { index } = req.body;
    const avt = (await avatarModel.find()).find((avt) => avt.index == index);
    if (!avt) {
      return res.status(404).send("avt not found");
    }

    res.send(avt);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Movie

app.get("/movies", async (req, res) => {
  const movies = await movieModel.find(); 
  res.send(movies);
});

app.get("/one_movie", async (req, res) => {
  try {
    const { movieId } = req.body;
    const movie = await movieModel.findOne({ movieId }).lean();

    if (!movie) {
      return res.status(404).send("Movie not found");
    }

    res.send(movie);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});



//User

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
    const decoded = jwt.verify(token, "GangGangGangPowPowPow");
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
  const { _id,name,email,date,gender,phone,spent } = req.user;
  const user = { _id,name,email,date,gender,phone,spent }
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
    const token = jwt.sign(rest, "GangGangGangPowPowPow");
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
//history 
app.get("/getHistory", async (req, res) => {
  const { Uid } = req.body;
  try {
    var ObjectId = require('mongodb').ObjectId;
    const id = new ObjectId(Uid);
    const result = await userModel.aggregate([
      {
        $match: { _id: id }
      },
      {
        $lookup: {
          from: 'histories',
          localField: '_id',
          foreignField: 'userId',
          as: 'historiesDetails',
        },
      },
      {
        $unwind: "$historiesDetails" 
      },
      {
        $lookup: {
          from: 'tickets',
          localField: 'historiesDetails.ticketId',
          foreignField: 'id',
          as: 'historiesDetails.ticketsDetails',
        },
      },
      {
        $unwind: "$historiesDetails.ticketsDetails"
      },
      {
        $lookup: {
          from: 'seats',
          localField: 'historiesDetails.ticketsDetails.seatId',
          foreignField: 'id',
          as: 'historiesDetails.ticketsDetails.seatDetails',
        },
      },
      {
        $unwind: "$historiesDetails.ticketsDetails.seatDetails"
      },
      {
        $lookup: {
          from: 'showtimes',
          localField: 'historiesDetails.ticketsDetails.showtimeId',
          foreignField: 'id',
          as: 'historiesDetails.ticketsDetails.showtimeDetails',
        },
      },
      {
        $unwind: "$historiesDetails.ticketsDetails.showtimeDetails"
      },
      {
        $lookup: {
          from: 'theaters',
          localField: 'historiesDetails.ticketsDetails.showtimeDetails.theaterId',
          foreignField: 'theaterId',
          as: 'historiesDetails.ticketsDetails.showtimeDetails.theaterDetails',
        },
      },
      {
        $unwind: "$historiesDetails.ticketsDetails.showtimeDetails.theaterDetails"
      },
      {
        $lookup: {
          from: 'movies',
          localField: 'historiesDetails.ticketsDetails.showtimeDetails.movieId',
          foreignField: 'movieId',
          as: 'historiesDetails.ticketsDetails.showtimeDetails.movieDetails',
        },
      },
      {
        $unwind: "$historiesDetails.ticketsDetails.showtimeDetails.movieDetails"
      },
      {
        $project: {
          userId: '$_id',
          ticketId: '$historiesDetails.ticketId',
          seatId: '$historiesDetails.ticketsDetails.seatDetails.id',
          price: '$historiesDetails.ticketsDetails.seatDetails.price',
          movieName: '$historiesDetails.ticketsDetails.showtimeDetails.movieDetails.title',
          theaterName: '$historiesDetails.ticketsDetails.showtimeDetails.theaterDetails.name',
          date: '$historiesDetails.ticketsDetails.showtimeDetails.date',
          time: '$historiesDetails.ticketsDetails.showtimeDetails.time',
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi server');
  }
});


app.post("/postHistory",async(req,res) => {
  const {id,ticketId} = req.body;
  const _id = id;
  try {
    const history = new historyModel({ ticketId, userId: _id });
    await history.save();
    res.send("success add ticketId");
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/getSchedule",async(req, res)=>{

  try {
    const result = await showtimeModel.aggregate([
      {
        $lookup: {
          from: 'movies', 
          localField: 'movieId',
          foreignField: 'movieId',
          as: 'movie',
        },
      },
      {
        $lookup: {
          from: 'theaters', 
          localField: 'theaterId',
          foreignField: 'theaterId',
          as: 'theater',
        },
      }
    ]);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi server');
  }
})


//main
app.get("/theaters", async (req, res) => {
  const theaters = await theaterModel.find();
  res.send(theaters);
});

app.get("halls", async (req, res) => {
  const halls = await hallModel.find();
  res.send(halls);
})

app.get("/showtimes", async (req, res) => {
  const showtimes = await showtimeModel.find();
  res.send(showtimes);
})

app.get("/seats", async (req, res) => {
  const seats = await seatModel.find();
  res.send(seats);
})

app.get("/tickets", async (req, res) => {
  const tickets = await ticketModel.find();
  res.send(tickets);
})

app.patch("/me/spent", JWTauthenticationMiddleware, async (req, res) => {
  // Lấy dữ liệu cần update từ body
  const { _id } = req.body;
  const user = await userModel.findOne({ _id }).lean();
  const length = user.history.length;
  try {  
    user.spent = 75000 * length;
    await userModel.updateMany({ _id }, user);
    res.json(user);  

} catch(err) {
if(!user) {
return res.status(404).json({message: 'User not found'});
}}
})

app.patch("/me/avt", JWTauthenticationMiddleware, async (req, res) => {
  // Lấy dữ liệu cần update từ body
  const { _id, avtId } = req.body;
  const avatarURL = (await avatarModel.find()).find((avt) => avt.index == avtId).image;
  console.log(avatarURL);
  const user = await userModel.findOne({ _id }).lean();
  try {  
    user.avatar = avatarURL;
    await userModel.updateMany({ _id }, user);
    res.json(user);

} catch(err) {
if(!user) {
return res.status(404).json({message: 'User not found'});
}}
})

//vnPay

// router.post('/create_payment_url', function (req, res, next) {
//   var ipAddr = req.headers['x-forwarded-for'] ||
//       req.connection.remoteAddress ||
//       req.socket.remoteAddress ||
//       req.connection.socket.remoteAddress;

//   var config = require('config');
//   var dateFormat = require('dateformat');

  
//   var tmnCode = config.get('KK6J8T2X');
//   var secretKey = config.get('FZKQEXGELYHWUXYHSLGGTLGXCPNQDBOI');
//   var vnpUrl = config.get('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
//   var returnUrl = config.get('http://localhost:3019/vnpay_return');

//   var date = new Date();

//   var createDate = dateFormat(date, '20231219103111');
//   var orderId = dateFormat(date, '103111');
//   var amount = req.body.amount;
//   var bankCode = req.body.bankCode;
  
//   var orderInfo = req.body.orderDescription;
//   var orderType = req.body.orderType;
//   var locale = req.body.language;
//   if(locale === null || locale === ''){
//       locale = 'vn';
//   }
//   var currCode = 'VND';
//   var vnp_Params = {};
//   vnp_Params['vnp_Version'] = '2.1.0';
//   vnp_Params['vnp_Command'] = 'pay';
//   vnp_Params['vnp_TmnCode'] = tmnCode;
//   // vnp_Params['vnp_Merchant'] = ''
//   vnp_Params['vnp_Locale'] = locale;
//   vnp_Params['vnp_CurrCode'] = currCode;
//   vnp_Params['vnp_TxnRef'] = orderId;
//   vnp_Params['vnp_OrderInfo'] = orderInfo;
//   vnp_Params['vnp_OrderType'] = orderType;
//   vnp_Params['vnp_Amount'] = amount * 100;
//   vnp_Params['vnp_ReturnUrl'] = returnUrl;
//   vnp_Params['vnp_IpAddr'] = ipAddr;
//   vnp_Params['vnp_CreateDate'] = createDate;
//   if(bankCode !== null && bankCode !== ''){
//       vnp_Params['vnp_BankCode'] = bankCode;
//   }

//   vnp_Params = sortObject(vnp_Params);

//   var querystring = require('qs');
//   var signData = querystring.stringify(vnp_Params, { encode: false });
//   var crypto = require("crypto");     
//   var hmac = crypto.createHmac("sha512", secretKey);
//   var signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex"); 
//   vnp_Params['vnp_SecureHash'] = signed;
//   vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

//   res.redirect(vnpUrl)
// });




main();