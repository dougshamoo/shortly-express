var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', this.hashPassword, this);
  },
  hashPassword: function() {
    // return new Promise(function(resolve, reject) {
    //   bcrypt.hash(model.attributes.password, bcrypt.genSaltSync(10), null, function(err, hash) {
    //     if (err) console.log('error: ',err);
    //     model.set('password', hash);
    //     resolve(hash);
    //   });
    // });

    var encrypt = Promise.promisify(bcrypt.hash);
    return encrypt(this.get('password'), null, null)
      .bind(this)
      .then(function(hash) {  // on success
        this.set('password', hash)
      }, function(err) {      // on failure
        console.log(err);
      });
  },
  checkPassword: function(attemptedPassword, callback) {
    bcrypt.compare(attemptedPassword, this.get('password'), callback);
  }
});

module.exports = User;