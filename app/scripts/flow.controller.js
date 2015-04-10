'use strict';

angular
  .module('app')
  .controller('FlowController', FlowController);

FlowController.$inject = ['$rootScope', 'api', 'fof'];

function FlowController ($scope, api, fof) {
  //var account = 'r3NwYomHtNynjCYLFSPB7Yva3LUBQDbWHe';
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

      getTx(account, null);
      status.html('');
    }
    else {
      status.html('Please enter valid Ripple Address.');
    }
  });


  function getTx (account, marker) {
    options = {
      ledger_index_min : -1,
      ledger_index_max : -1,
      account : account
    };
    if (marker) options.marker = marker;
    api.getAccountTx(options, function(err, response){
      if (err) console.log("Error:", err);
      else {
        console.log("Response:", response);
        balanceChanges = balanceChanges.concat(prepareTx(account, response.transactions));
        if (response.marker && balanceChanges.length < 5000) {
          getTx(account, response.marker)
        }
        else {
          drawFlow(balanceChanges);
        }
      }
    });
  }


  function prepareTx(account, transactions) {
    var transaction, nodes, node, nodeType, nodeField, balanceChange;
    var balanceChanges = [];

    for (var i=0; i<transactions.length; i++) {
      transaction = transactions[i];
      nodes       = transaction.meta.AffectedNodes;

      //console.log(nodes);

      for (var j=0; j<nodes.length; j++) {
        node        = nodes[j];
        nodeType    = node.CreatedNode || node.ModifiedNode || node.DeletedNode;
        nodeField   = nodeType.NewFields || nodeType.FinalFields;

        //Deal with missing NodeField
        if (nodeField) {

          // console.log("N:", node);
          // console.log("NT:", nodeType);
          // console.log("NF:", nodeField);

          balanceChange = {
            //account      : account,
            tx           : transaction.tx,
            ledger_index : transaction.tx.ledger_index,
            date         : formatDate(transaction.tx.date)
          }

          if (nodeType.LedgerEntryType === "AccountRoot") {
            if (nodeField.Account === account) {
              balanceChange.issuer   = "";
              balanceChange.currency = "XRP";
              balanceChange.value    = +nodeField.Balance * 1e-6;
              balanceChanges.push(balanceChange);
            }
          }
          else if (nodeType.LedgerEntryType === "RippleState") {
            if (nodeField.HighLimit.issuer === account) {
              balanceChange.issuer   = nodeField.LowLimit.issuer;
              balanceChange.currency = nodeField.Balance.currency;
              balanceChange.value    = -nodeField.Balance.value;
              balanceChanges.push(balanceChange);
            }
          }

        }

      }

    }

    //console.log("BCs:", balanceChanges);
    return balanceChanges;
  }

  var bases = ["USD"],
    BITSTAMP = "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
    RATES = {};

  function drawFlow(balances) {
    fof.FlowCharts(balances);
  }

  function formatDate(d) {
    return new Date(9466848e5 + d * 1e3);
  }

}

1100
200
700
1800
