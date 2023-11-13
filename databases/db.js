const mongoose = require("mongoose");

async function connectToDatabase() {
  try {
    await mongoose.connect(
      "mongodb+srv://ongtrandong2:dongdong2@uitheater.h9f5vua.mongodb.net/?retryWrites=true&w=majority"
    );
    console.log("connected to db");
  } catch (error) {
    console.error(error);
  }
}

module.exports = connectToDatabase;