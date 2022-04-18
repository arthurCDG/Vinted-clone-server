const mongoose = require("mongoose");

const User = mongoose.model("User", {
  account: {
    username: {
      type: String,
      // required: true,
    },
    avatar: Object,
  },
  email: {
    type: String,
    unique: true,
  },
  token: String,
  hash: String,
  salt: String,
  newsletter: Boolean,
});

module.exports = User;
