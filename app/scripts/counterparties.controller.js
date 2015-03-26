'use strict';

angular
  .module('app')
  .controller('CounterpartiesController', CounterpartiesController);

CounterpartiesController.$inject = ['$rootScope', 'api', 'cp', 'mouseover'];

function CounterpartiesController ($scope, api, cp, mouseover)
{


  var width = 960;
  var height = 600;
  var accounts = [];

  var format = d3.format(",.2f");

  var svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var svg2 = d3.select("#transactions").append("svg")
    .attr("width", width + 380)
    .style("margin-left", "-100px")
    .append("g")
    .attr("transform", "translate(350,100)");

  d3.select("#load").on("click", function(){
    var account = document.getElementById("wallet").value;
    if (accounts.indexOf(account) === -1) {
      accounts.push(account);
      getLines(accounts);
    }
  });

  var downloadButton = d3.select("#transactions").append("p").append("button")
    .attr("class", "btn btn-default")
    .text("Export transactions as CSV");

  function getLines(accounts) {

    console.log('accounts:', accounts);

    accounts = accounts.map(function(d) { return {account: d}; });

    var tbody = d3.select("#results"),
        totals = [0, 0, 0, 0, 0],
        tfoot = d3.select("#results-totals").select("tr").selectAll("td").data(totals);
    tfoot.enter().append("td").attr("class", "right");
    tfoot.text("");
    tbody.selectAll("*").remove();
    tbody.selectAll("tr")
        .data(accounts)
      .enter().append("tr").each(function(d) {
        var account = d.account;
        var tr = d3.select(this);
        tr.append("td").text(account)
            .on("mouseover", mouseover.mousemove)
            .on("mouseout", mouseover.tooltipHide);
        var td1 = tr.append("td");
        d3.xhr('https://id.ripple.com/v1/user/'+account, function(err, res){
          if (!err) {
            console.log("no err");
            var response = JSON.parse(res.response);
            if (response.username) td1.text(response.username);
          }
        });
        td1.text("N/A");
        var td2 = tr.append("td");
        d3.json("//ripple-id.3taps.com/get_owner?account_id=" + encodeURIComponent(account), function(error, json) {
          td2.text(error || !json.success ? "N/A" : json.owner.username);
        });
        var td3 = tr.append("td").classed("right", true);
        var td4 = tr.append("td").classed("right", true);
        var td5 = tr.append("td").classed("right", true);
        var td6 = tr.append("td").classed("right", true);
        var td7 = tr.append("td").classed("right", true);
        api.getAccountLines(account, function(err, result) {
              var lines = result.lines,
                  currencies = lines.map(function(d) { return {currency: d.currency, issuer: d.account}; }),
                  balanceByCurrency = {};
              currencies.push({currency: "XRP"});
              lines.forEach(function(line) {
                var currency = line.currency;
                if (balanceByCurrency.hasOwnProperty(currency)) balanceByCurrency[currency] += +line.balance;
                else balanceByCurrency[currency] = +line.balance;
              });
              td3.text(format(balanceByCurrency.USD || 0))
              td4.text(format(balanceByCurrency.BTC || 0))
              //td3.text(balanceByCurrency.USD || 0);
              //td4.text(balanceByCurrency.BTC || 0);
              totals[0] += balanceByCurrency.USD || 0;
              totals[1] += balanceByCurrency.BTC || 0;
              tfoot.data(totals).text(format);
              //tfoot.data(totals).text(function (d) { return d });
              api.getAccountInfo(account, function(err, result) {
                    var xrp = +result.account_data.Balance * 1e-6;
                    lines.push({currency: "XRP", balance: xrp});
                    td5.text(format(xrp));
                    //td5.text(xrp);
                    totals[2] += xrp;
                    tfoot.data(totals).text(format);
                    //tfoot.data(totals).text(function (d) { return d });
                    rates(currencies, function(error, rates) {
                      if (error) return;
                      var balance = 0,
                          other = 0,
                          rateByCurrency = {};
                      for (var i = 0, n = rates.length; i < n; ++i) {
                        var rate = rates[i];
                        rateByCurrency[rate.counter.currency + "\0" + rate.counter.issuer] = rate.rate;
                      }
                      for (var i = 0, n = lines.length; i < n; ++i) {
                        var line = lines[i],
                            key = line.currency + "\0" + line.account;
                        if (rateByCurrency.hasOwnProperty(key)) {
                          var usd = line.balance / rateByCurrency[key];
                          balance += usd;
                          if (!/^(USD|BTC|XRP)$/.test(line.currency)) other += usd;
                        }
                      }
                      td6.text(format(other));
                      td7.text(format(balance));
                      //td6.text(other);
                      //td7.text(balance);
                      totals[3] += other;
                      totals[4] += balance;
                      tfoot.data(totals).text(format);
                      //tfoot.data(totals).text(function (d) { return d });
                    });
                  })
        })
      });
  
    svg.selectAll("*").remove();
    svg2.selectAll("*").remove();

    var q = queue();

    accounts.forEach(function(d) {
      console.log("D:", d, "transactions", transactions, "d.account", d.account.trim());
      q.defer(transactions, d.account.trim());
    });

    q.awaitAll(function(error, a) {

      downloadButton.on("click", function() {
        exportCSV(
          transactions,
          ["account", "counterparty", "type", "normalized amount", "amount", "currency", "issuer", "date"],
          function(d) {
            return [
              d.account,
              d.counterparty,
              d.type,
              d.amount,
              d.currencyAmount,
              d.currency,
              d.issuer,
              d.time
            ];
          }
        );
      });

      var transactions = d3.merge(a.map(function(d) {
        d.transactions.forEach(function(t) { t.account = d.account; });
        return d.transactions;
      }));
      console.log("tx after q", transactions);
      svg2.call(cp.transactionsChart, svg, accounts, transactions);
    });
  }

  function transactions(account, callback) {
    var q = queue();
    for (var i = 0; i < 2; ++i) {
      q.defer(chunk, account, i * 500);
    }
    q.awaitAll(function(error, result) {
      if (error) return void callback(error);
      callback(null, {account: account, transactions: d3.merge(result)});
    });
  }

  function chunk(account, offset, callback) {
    d3.json("//api.ripplecharts.com/api/accountTransactions")
        .header("Content-Type", "application/json")
        .post(JSON.stringify({account: account, offset: offset, startTime: "Jan 1, 2013"}), function(error, result) {
          if (error) return void callback(error);
          var headers = result.shift();
          callback(null, result.map(function(row) {
            var o = {};
            for (var i = 0; i < row.length; ++i) o[headers[i]] = row[i];
            o.time = d3.time.format.iso.parse(o.time);
            return o;
          }));
        });
  }

  function rates(currencies, callback) {
  var bases = ["USD"],
  BITSTAMP = "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B";
  var pairs = currencies.map(function(d) {
    return {
      base: {currency: "USD", issuer: BITSTAMP},
      counter: d
    };
  }).filter(function(d) {
    return !(d.base.currency === d.counter.currency && d.base.issuer === d.counter.issuer);
  });
  d3.json("//api.ripplecharts.com/api/exchangeRates")
      .header("Content-Type", "application/json")
      .post(JSON.stringify({pairs: pairs, range: "day"}), function(error, result) {
        callback(error, result);
      });
  } 

  d3.select(window).on("hashchange", hashchange);

  function hashchange() {
    var h = location.hash.substring(1);
    if (h) getLines([h]);
  }

  function exportCSV(data, headers, f) {
    var n = headers.length,
        rows = [headers].concat(data.map(f || function(d) {
          var row = new Array(n);
          for (var i = 0; i < n; ++i) {
            row[i] = d[headers[i]];
          }
          return row;
        }));
    window.open("data:text/csv;charset=utf-8," + encodeURIComponent(d3.csv.formatRows(rows)));
  }
  
}
