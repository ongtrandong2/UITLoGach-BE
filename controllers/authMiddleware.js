const jwt = require("jsonwebtoken");
const userModel = require("../models/user");

async function JWTauthenticationMiddleware(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "UITLoGachNho");
    const { email } = decoded;
    const user = await userModel.findOne({ email });
    if (user) {
      req.user = user;
      next();
    }
  } catch (error) {
    res.sendStatus(401);
  }
}

module.exports = JWTauthenticationMiddleware;