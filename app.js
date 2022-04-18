// Generate an express app
const express = require("express");
const app = express();

// Use the CORS package
const cors = require("cors");
app.use(cors());

// Use the .env file
require("dotenv").config();

// Connect to database
require("./config/db-init");
// Connect to Cloudinary
require("./config/cloudinary.config");

// Require the formidable middleware and have the app using it on every route
const formidableMiddleware = require("express-formidable");
app.use(formidableMiddleware());

// Routes
app.use("/auth", require("./routes/auth.routes"));
app.use("/offer", require("./routes/offer.routes"));
app.all("*", (req, res) => res.status(404).json("Page not found"));

// Listen to Port 3000
app.listen(process.env.PORT, () => console.log("The server started"));
