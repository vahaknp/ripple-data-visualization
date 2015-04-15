'use strict';

angular
  .module('app')
  .service('api', api);

api.$inject = ['$rootScope'];

function api () {

  //Old API calls

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

  //New API calls

  var url = 'http://23.22.138.145:7111/v1';
  var querystring = require('querystring');

  this.getBalanceChanges = function (account, options, callback) {

    var endpoint = url + '/accounts/' + account + '/balance_changes?' + querystring.stringify(options);
    console.log("Endpoint:", endpoint);

    $.ajax({ 
      url  : endpoint,
      success : function (tx) { callback(null, tx) },
      error : function (err) { callback(err) } 
    });

  }

  this.normalize = function (currency, issuer, options, callback) {
    var endpoint = url + '/exchanges/' + currency + '+' + issuer + '/XRP?' + querystring.stringify(options);
    console.log("REP:", endpoint);
    $.ajax({ 
      url  : endpoint,
      success : function (exchange) { callback(null, exchange.exchanges[0].vwap) },
      error : function (err) { callback(err) } 
    });
  }

}