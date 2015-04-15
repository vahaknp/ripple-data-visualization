'use strict';

angular
  .module('app')
  .controller('FlowController', FlowController);

FlowController.$inject = ['$rootScope', 'api', 'fof'];

function FlowController ($scope, api, fof) {

  var balanceChanges = [];
  var options = {};
  var account;
  var LOADER_PNG = "app/images/rippleThrobber.png";
  var loader;
  var status = d3.select('.status');

  d3.select('#load').on('click', function(){
    account = document.getElementById("wallet").value;
    if (account.length > 30 && account.length < 40 && account[0] === "r") {
      d3.select("#dropdowns").html("");
      d3.select("#chart").html("");

      loader = d3.select("#chart").append("img")
        .attr("class", "loader")
        .attr("src", LOADER_PNG);

      getBalanceChanges(account, null);
      status.html('');
    }
    else {
      status.html('Please enter valid Ripple Address.');
    }
  });


  function getBalanceChanges (account, marker) {
    options = {};
    if (marker) options.marker = marker;
    api.getBalanceChanges(account, options, function(err, response){
      if (err) console.log("Error:", err);
      else {
        balanceChanges = balanceChanges.concat(prepareTx(response.balance_changes));
        if (response.marker && balanceChanges.length < 5000) {
          getBalanceChanges(account, response.marker)
        }
        else {
          console.log("Final:", balanceChanges);
          fof.FlowCharts(balanceChanges);
        }
      }
    });
  }


  function prepareTx(changes) {
    var balanceChanges = [];

    changes.forEach(function(change) {

      var bc = {
        value        : parseFloat(change.final_balance),
        amount       : change.change,
        currency     : change.currency,
        issuer       : change.issuer ? change.issuer : "",
        date         : moment(change.executed_time)._d,
        ledger_index : change.ledger_index,
        change_type  : change.change_type
      }

      //Normalize if not specific.

      if (change.currency !== "XRP") {
        
        var options = {
          limit    : 1,
          end      : moment(change.executed_time).format(),
          interval : "1day"
        };

        api.normalize(change.currency, change.issuer, options, function(err, rate) {
          if (err) console.log("Rate Error:", err);
          else console.log("Rate:", rate);
        });
      }

      balanceChanges.push(bc);

    });

    return balanceChanges;
  }

}
