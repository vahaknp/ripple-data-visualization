'use strict';

angular
  .module('app')
  .service('api', api);

api.$inject = ['$rootScope'];

function api () {

  var remote = new ripple.Remote({
    servers: [ 'wss://s1.ripple.com:443' ]
  });

  remote.connect(function() {
    console.log("Remote connected.")
    remote.requestServerInfo(function(err, info) {
      if (err) console.log(err);
      else console.log(info);
    });
  });

  this.getAccountInfo = function(wallet, callback) {
    remote.requestAccountInfo({
      account : wallet
    }, function(err, accountInfo) {
      if (err) callback(err);
      else callback(null, accountInfo);
    });
  }

  this.getAccountLines = function(wallet, callback) {
    remote.requestAccountLines({
      account : wallet
    }, function(err, accountLines) {
      if (err) callback(err);
      else callback(null, accountLines);
    });
  }

  this.getAccountTx = function(options, callback){
    remote.requestAccountTransactions(options, function(err, tx) {
      if (err) callback(err);
      else callback(null, tx);
    });
  }

}