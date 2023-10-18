const mongoose = require("mongoose");

export const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    date: String,
    gender: String,
  });