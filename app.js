//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const findOrCreate = require('mongoose-find-or-create');


const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

/////////  Mongoose  ///////////

mongoose.set("strictQuery", false);
mongoose.connect(
  "mongodb+srv://fahadkhan:" +
    process.env.MONGO_PASS +
    "@cluster0.gv3eye4.mongodb.net/userDB"
);
// mongodb://localhost:27017/userDB

/////////  Encryptions  ///////////

app.use(
  session({
    secret: process.env.SOME_LONG_UNGUESSABLE_STRING,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

/////////  SCHEMA  ///////////
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  googleId:String,
  githubId:String,
  secret:[{type:String}],
  // secret:String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

////////  OAUTH GOOGLE //////////////

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
},
function(accessToken, refreshToken, profile, cb) {
  // console.log(profile);
  User.findOrCreate({ email: profile.emails[0].value,googleId: profile.id }, function (err, user) {
    return cb(err, user);
  }); 
}
));

app.get("/auth/google",
  passport.authenticate("google",{scope:["profile","email"]})
);

app.get("/auth/google/secrets",
  passport.authenticate("google",{failureRedirect:"/login"}),
  function(req,res){
    res.redirect("/secrets");
  }
);

///////////////  GITHUB //////////////
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/github/secrets"
},
function(accessToken, refreshToken, profile, done) {
  // console.log(profile);
  User.findOrCreate({username:profile.username,githubId: profile.id }, function (err, user) {
    return done(err, user);
  });
}
));
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


///////////  HOME //////////////
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
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, function (err) {
      if (err) {
        console.log(err);
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        });
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
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      }
    );
  });


////////  SECRETS //////////////
app.route("/secrets")
.get(function (req, res) {
  User.find({"secret":{$ne:null}},function(err,foundUsers){
    if(!err){
      if(foundUsers){
        res.render("secrets",{usersWithSecrets:foundUsers})
      }
    }
    else{
      console.log(err);
    }
  })
});

////////  SUBMIT //////////////
app.route("/submit")

.get(function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
})
.post(function(req,res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id,function(err,foundUser){
    if(!err){
      if(foundUser){
        foundUser.secret.push(submittedSecret);
        // foundUser.secret=submittedSecret;
        foundUser.save(function(){
        console.log(foundUser);
        res.redirect("/secrets");
        });
    }
    }
    else{
      console.log(err);
    }

  })
})

;

////////  LOGOUT //////////////
app.route("/logout").get(function(req,res){
  req.logout(function(err){
    if(!err){

      res.redirect("/");
    }
  });
})


////////  LISTEN //////////////
const PORT = process.env.PORT;
app.listen(PORT, function (req, res) {
  console.log(`Server on ${PORT}`);
});
