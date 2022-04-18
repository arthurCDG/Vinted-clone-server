// Create an express router
const express = require("express");
const router = express.Router();

// Retrieve Cloudinary
const cloudinary = require("cloudinary").v2;

// Require the isAuthenticated middleware to use it on some routes
const isAuthenticated = require("./../middlewares/isAuthenticated");

// Retrieve models
const User = require("./../models/User.models");
const Offer = require("./../models/Offer.models");

// Publish a new vinted offer
router.post("/publish", isAuthenticated, async (req, res, next) => {
  try {
    // See if the offer's price is superior to 100 000, and if so return an error
    if (req.fields.product_price > 100000) {
      res.status(400).json({ error: "The price must be under 100 000 euros." });
      // See if the offer's description is superior to 500 characters and if so return an error
    } else if (req.fields.product_description.length > 500) {
      res
        .status(400)
        .json({ error: "The description must be under 500 characters" });
      // See if the offer's title is superior to 50 characters and if so return an error
    } else if (req.fields.product_name.length > 50) {
      res.status(400).json({ error: "The name must be under 50 characters" });
    } else {
      // create a new Offer from req.fields
      const newOffer = new Offer(req.fields);
      // Upload the picture on Cloudinary
      const pictureUploaded = await cloudinary.uploader.upload(
        req.files.picture.path,
        { folder: `vinted/offers/${newOffer._id}` }
      );
      // Change product_image from req.file.picture.path?
      newOffer["product_image"] = { secure_url: pictureUploaded.url };
      // Retrieve the token from the req (req.headers.token)?
      const userToken = req.headers.authorization.replace("Bearer ", "");
      // If no token, error message
      if (!userToken) {
        res.status(400).json({ error: { message: "No token provided" } });
      } else {
        // Search the User in the DB whose token is this token
        const tokenBearer = await User.findOne({
          token: req.headers.authorization.replace("Bearer ", ""),
        });
        // If no user, error message
        if (!tokenBearer) {
          res
            .status(400)
            .json({ error: { message: "No user with this token" } });
        } else {
          // Add this user's mongoDB Id in the field owner
          newOffer.owner = tokenBearer._id;
          // Save it in the DB
          await newOffer.save();
          // Retrieve from the DB the Offer object with the owner populated
          const ownerToReturn = await Offer.findOne({
            token: req.headers.authorization.replace("Bearer ", ""),
          }).populate("owner");
          // Return the Offer object
          res.json(ownerToReturn);
        }
      }
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a publication
router.delete("/delete/:id", async (req, res, next) => {
  try {
    // See if there is an offer with this Id, and if so delete it
    const offerToDelete = await Offer.findByIdAndDelete(req.params.id);
    // If there is no offer, return an error message
    if (!offerToDelete) {
      res.status(400).json({ error: "No offer with this Id" });
    } else {
      // Delete the cloudinary file(s)
      await cloudinary.api.delete_resources_by_prefix(
        `api/vinted/offers/${req.params.id}`
      );
      // Delete the cloudinary folder
      await cloudinary.api.delete_folder(`api/vinted/offers/${req.params.id}`);
      // Return a success message
      res.json({ message: "Success, offer deleted" });
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Modify a publication
router.put("/modify/:id", async (req, res, next) => {
  try {
    // See if there is an offer with this Id
    const offerToModify = await Offer.findById(req.params.id);
    // If there is no offer, return an error message
    if (!offerToModify) {
      res.status(400).json({ error: "No offer with this Id" });
    } else {
      //
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Display all offers, depending on the filter queries
router.get("/", async (req, res, next) => {
  try {
    // Set an empty object that will hold all filters from query
    const filtersObject = {};
    // Modify filtersObject with title query (if it exists)
    if (req.query.title)
      filtersObject.product_name = new RegExp(req.query.title, "i");
    // Modify filtersObject with priceMin query (if it exists)
    if (req.query.priceMin)
      filtersObject.product_price = { $gte: req.query.priceMin };
    // Modify filtersObject with priceMax query (if it exists)
    if (req.query.priceMax) {
      if (filtersObject.product_price) {
        filtersObject.product_price.$lte = req.query.priceMax;
      } else {
        filtersObject.product_price = { $lte: req.query.priceMax };
      }
    }

    // Set a second empty boject for sort queries
    const sortObject = {};
    if (req.query.sort === "price-desc") {
      sortObject.product_price = "desc";
    } else if (req.query.sort === "price-asc") {
      sortObject.product_price = " asc";
    }

    // Handle the case where pageLimit and pageNumber do not exist in the query (give it default values)
    let pageNumber = 1;
    let pageLimit = 5;
    if (req.query.pageNumber) pageNumber = req.query.pageNumber;
    if (req.query.pageLimit) pageLimit = req.query.pageLimit;

    //!!! CONSOLE LOG OF ALL QUERIES
    console.log("This is filtersObject", filtersObject);
    console.log("This is sortObject", sortObject);
    console.log("This is pageNumber", pageNumber);
    console.log("This is pageLimit", pageLimit);
    //!!! CONSOLE LOG OF ALL QUERIES

    // Retrieve all offers from the DB (with filtersObject as the argument for find)
    const allOffers = await Offer.find(filtersObject)
      .sort(sortObject)
      // Calcul pour le skip ==> skip = (pageNumber - 1) * pageLimit
      .skip((req.query.pageNumber - 1) * req.query.pageLimit)
      // To get only X offers per page
      .limit(req.query.pageLimit)
      // Send only the id, the product name and the product price for the offer object
      .select("product_name product_price");

    //? POURQUOI ON FAIT CA ???
    const count = await Offer.countDocuments(filtersObject);

    // Retur the all offers and the count
    res.json({ count, allOffers });
  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Display the details of a specific offer with its Id
router.get("/:id", async (req, res, next) => {
  try {
    // Retrieve the offer from the DB with this ID
    const searchedOffer = await Offer.findById(req.params.id);
    // If no offer is found with its Id, return an error
    if (!searchedOffer) {
      res
        .status(400)
        .json({ error: { message: "No offer found with this Id" } });
    }
    // Else, return the object
    else {
      res.json(searchedOffer);
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

module.exports = router;
