const User = require("../models/User.models");

const isAuthenticated = async (req, res, next) => {
  // See if there is a token in the request headers
  if (req.headers.authorization) {
    // If so, see if there is a user in the DB matching this token
    const matchingUserInTheDB = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    });
    // If there is a user, change req.user = user and return next()
    if (matchingUserInTheDB) {
      req.user = matchingUserInTheDB;
      return next();
    }
    // Else, error
    else {
      res.status(400).json({ error: { message: "Unauthorized!" } });
    }
  } else {
    // Else error
    res.status(400).json({ error: { message: "Unauthorized!" } });
  }
};

module.exports = isAuthenticated;
