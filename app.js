//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

/////////  Encryptions  ///////////
const encrypt = require("mongoose-encryption");
const bcrypt = require("bcrypt");
const saltRounds = 10;

/////////  Mongoose  ///////////
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
mongoose.connect(
  "mongodb+srv://fahadkhan:" +
    process.env.MONGO_PASS +
    "@cluster0.gv3eye4.mongodb.net/userDB"
);
// mongodb://localhost:27017/userDB


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));


/////////  SCHEMA  ///////////
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const secret = process.env.SOME_LONG_UNGUESSABLE_STRING;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

app.get("/", function (req, res) {
  res.render("home");
});



////////  LOGIN //////////////
app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })

  .post(function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username }, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          bcrypt.compare(password, foundUser.password, function (err, result) {
            if (result === true) {
              res.render("secrets");
            }
          });
        }
      }
    });
  });



////////  REGISTER //////////////
app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })

  .post(function (req, res) {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      const newUser = new User({
        email: req.body.username,
        password: hash,
      });

      newUser.save(function (err) {
        if (err) {
          console.log(err);
        } else {
          res.render("secrets");
        }
      });
    });
  });



////////  LISTEN //////////////
const PORT = process.env.PORT;
app.listen(PORT, function (req, res) {
  console.log(`Server on ${PORT}`);
});
