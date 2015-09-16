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

var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(expressSession({
  secret: 'bacon is delicious',
  resave: false,
  saveUninitialized: false
}));

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/', restrict,
function(req, res) {
  res.render('index');
});

app.get('/create', restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});
 
app.get('/login',
function(req, res) { 
  res.render('login');
});

app.get('/logout',
function(req, res) {
  req.session.destroy(function() {
    res.end('http://127.0.0.1:4568/login');
  });
});

// also restrict post on /links
app.post('/links', 
function(req, res) {
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

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup', 
function(req, res) {
  
  var username = req.body.username;
  var password = req.body.password;
  var user = new User({
    username: username,
    password: password
  });
  user.save().then(function(newUser) {
    Users.add(newUser);
    
    generateSession(req, res, user.get('username'));
  });
});


app.post('/login',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  var hash = bcrypt.hashSync(password);
  new User({username: username})
    .fetch()
    .then(function(userObj) {
      if (userObj) {
        userObj.checkPassword(password, function(err, isMatch) {
          if (isMatch) {
            generateSession(req, res, userObj.get('username'));
          } else {
            console.log('Incorrect password');
            res.redirect('/login');
          }
        });
      } else {      
      // if (userObj && bcrypt.compareSync(password, userObj.get('password'))) {
      //   generateSession(req, res, userObj.get('username'));
      // }
      // else {
      //   res.redirect('/login');
      // } 
        console.log('User not found');
        res.redirect('/login');
      }
    }); 
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

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

var generateSession = function(req, res, username) {
  req.session.regenerate(function() {
    req.session.user = username;
    res.redirect('/');
  });
};

console.log('Shortly is listening on 4568');
app.listen(4568);
