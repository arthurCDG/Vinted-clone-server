// Create an express router
const express = require("express");
const router = express.Router();

// Require password hashing, encrypting, and salting packages
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

// Retrieve cloudinary
const cloudinary = require("cloudinary").v2;

// Retrieve models
const User = require("./../models/User.models");

// Sign up
router.post("/signup", async (req, res) => {
  try {
    // Case where there is no password
    if (!req.fields.password) {
      res.status(400).json("Please provide a password");
    }
    // Case where there is no email
    else if (!req.fields.email) {
      res.status(400).json("Please provide an email");
    }
    // Case where there is no username
    else if (!req.fields.username) {
      res.status(400).json("Please provide a username");
    }
    // Case where the email already exists
    else {
      const existingEmail = await User.findOne({ email: req.fields.email });

      if (existingEmail) {
        res.status(400).json("This email is already taken");
      } else {
        // Retrieve the password
        const password = req.fields.password;
        // Generate a SALT
        const salt = uid2(16);
        // Hash the password, with the SALT
        const hash = SHA256(password + salt).toString(encBase64);
        // Generate a token
        const token = uid2(16);
        // Create the user
        const newUser = new User({
          account: {
            username: req.fields.username,
            avatar: {
              secure_url: "",
            },
          },
          email: req.fields.email,
          newsletter: req.fields.newsletter,
          token,
          hash,
          salt,
        });
        // Retrieve the picture, upload it, and save the path to Cloudinary in a variable
        const uploadedPicture = await cloudinary.uploader.upload(
          req.files.avatar.path,
          {
            folder: `vinted/users/${newUser._id}`,
          }
        );
        // Add the picture to the avatar key in the newUser object
        newUser.account.avatar["secure_url"] = uploadedPicture.url;
        // Save the user in the DB
        await newUser.save();
        // Return the user object with its MongoDB Id, token, account and username
        res.json({
          _id: newUser._id,
          token: newUser.token,
          account: {
            username: newUser.account.username,
            avatar: newUser.account.avatar,
          },
        });
      }
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    // Check if there already is a user in the DB with this email
    const userToCheck = await User.findOne({ email: req.fields.email });

    // If there is a user with this email, return an error message
    if (!userToCheck) {
      res.status(401).json({ message: "Unauthorized!" });
      // Else, check if the password works
    } else {
      const newHash = SHA256(req.fields.password + userToCheck.salt).toString(
        encBase64
      );

      // If the password is not correct, return an error message
      if (newHash !== userToCheck.hash) {
        res.status(401).json({ message: "Unauthorized!" });
      } else {
        // Else, return the user object
        res.json({
          _id: userToCheck._id,
          token: userToCheck.token,
          account: {
            username: userToCheck.account.username,
          },
        });
      }
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Export the router
module.exports = router;
