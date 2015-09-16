var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;
var app = express();

var GITHUB_CLIENT_ID = '8d3a9524fd378bce4e40';
var GITHUB_CLIENT_SECRET = '7c4912c0e8e7115416afe3faf45aded0fdba07cc';

// Client ID
// 8d3a9524fd378bce4e40
// Client Secret
// 7c4912c0e8e7115416afe3faf45aded0fdba07cc

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:4568/oauthcallback"
  },
  function(accessToken, refreshToken, profile, done) {

    process.nextTick(function() {

      return done(null, profile);
    });
  }
));


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(expressSession({
  secret: 'bacon is delicious',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { 
    return next(); 
  }
  res.redirect('/login');
}

app.get('/', ensureAuthenticated, function(req, res) {
  res.render('index');
});

app.get('/create', ensureAuthenticated, function(req, res) {
  res.render('index');
});

app.get('/links', ensureAuthenticated, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});
 
app.get('/login',
passport.authenticate('github', { scope: [ 'user:email' ] }),
function(req, res){
  //won't be called
});

app.get('/logout',
function(req, res) {
  // req.logout();
  // res.end('http://127.0.0.1:4568/login');
  req.session.destroy(function() {
    res.end('http://127.0.0.1:4568/login');
  });
});

app.post('/links', ensureAuthenticated,
  function(req,res) {
    var uri = req.body.url;
    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }
    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }
          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin
          });
          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      }
    });
  });


app.get('/oauthcallback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });
      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});


// function restrict(req, res, next) {
//   if (req.session.user) {
//     next();
//   } else {
//     req.session.error = 'Access denied!';
//     res.redirect('/login');
//   }
// }

// app.get('/', restrict,
// function(req, res) {
//   res.render('index');
// });

// app.get('/create', restrict,
// function(req, res) {
//   res.render('index');
// });

// app.get('/links', restrict,
// function(req, res) {
//   Links.reset().fetch().then(function(links) {
//     res.send(200, links.models);
//   });
// });

// app.get('/signup',
// function(req, res) {
//   res.render('signup');
// });
 
// app.get('/login',
// function(req, res) { 
//   res.render('login');
// });

// app.get('/logout',
// function(req, res) {
//   req.session.destroy(function() {
//     res.end('http://127.0.0.1:4568/login');
//   });
// });

// app.post('/links', restrict,
// function(req, res) {
//   var uri = req.body.url;

//   if (!util.isValidUrl(uri)) {
//     console.log('Not a valid url: ', uri);
//     return res.send(404);
//   }

//   new Link({ url: uri }).fetch().then(function(found) {
//     if (found) {
//       res.send(200, found.attributes);
//     } else {
//       util.getUrlTitle(uri, function(err, title) {
//         if (err) {
//           console.log('Error reading URL heading: ', err);
//           return res.send(404);
//         }

//         var link = new Link({
//           url: uri,
//           title: title,
//           base_url: req.headers.origin
//         });

//         link.save().then(function(newLink) {
//           Links.add(newLink);
//           res.send(200, newLink);
//         });
//       });
//     }
//   });
// });

// /************************************************************/
// // Write your authentication routes here
// /************************************************************/

// app.post('/signup', 
// function(req, res) {
  
//   var username = req.body.username;
//   var password = req.body.password;
//   var user = new User({
//     username: username,
//     password: password
//   });
//   user.save().then(function(newUser) {
//     Users.add(newUser);
    
//     generateSession(req, res, user.get('username'));
//   });
// });


// app.post('/login',
// function(req, res) {
//   var username = req.body.username;
//   var password = req.body.password;

//   var hash = bcrypt.hashSync(password);
//   new User({username: username})
//     .fetch()
//     .then(function(userObj) {
//       if (userObj) {
//         userObj.checkPassword(password, function(err, isMatch) {
//           if (isMatch) {
//             generateSession(req, res, userObj.get('username'));
//           } else {
//             console.log('Incorrect password');
//             res.redirect('/login');
//           }
//         });
//       } else {      
//       // if (userObj && bcrypt.compareSync(password, userObj.get('password'))) {
//       //   generateSession(req, res, userObj.get('username'));
//       // }
//       // else {
//       //   res.redirect('/login');
//       // } 
//         console.log('User not found');
//         res.redirect('/login');
//       }
//     }); 
// });

// /************************************************************/
// // Handle the wildcard route last - if all other routes fail
// // assume the route is a short code and try and handle it here.
// // If the short-code doesn't exist, send the user to '/'
// /************************************************************/

// app.get('/*', function(req, res) {
//   new Link({ code: req.params[0] }).fetch().then(function(link) {
//     if (!link) {
//       res.redirect('/');
//     } else {
//       var click = new Click({
//         link_id: link.get('id')
//       });
//       click.save().then(function() {
//         db.knex('urls')
//           .where('code', '=', link.get('code'))
//           .update({
//             visits: link.get('visits') + 1,
//           }).then(function() {
//             return res.redirect(link.get('url'));
//           });
//       });
//     }
//   });
// });

// var generateSession = function(req, res, username) {
//   req.session.regenerate(function() {
//     req.session.user = username;
//     res.redirect('/');
//   });
// };

console.log('Shortly is listening on 4568');
app.listen(4568);
