var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', this.hashPassword, this);
  },
  hashPassword: function(model, attrs, options) {
    return new Promise(function(resolve, reject) {
      bcrypt.hash(model.attributes.password, bcrypt.genSaltSync(10), null, function(err, hash) {
        if (err) console.log('error: ',err);
        model.set('password', hash);
        resolve(hash);
      });
    });
  }
});

module.exports = User;