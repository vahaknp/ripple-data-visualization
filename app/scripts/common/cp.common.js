'use strict';

angular
  .module('app')
  .service('cp', cp);

cp.$inject = ['$rootScope', 'mouseover'];

  function cp($scope, mouseover) {

    var identities = {},
    contacts = {};
    
    this.transactionsChart = function (svg2, svg, a, transactions, key) {

    console.log("Svg2:", svg2);
    console.log("Svg:", svg);
    console.log("a?:", a);
    console.log("transactions:", transactions);
    console.log("key:", key);

    // First grab exchange rates.
    var currencies = d3.set();
    transactions.forEach(function(t) {
      if (t.issuer) currencies.add(t.currency + "\0" + t.issuer);
    });
    currencies = currencies.values().map(function(d) { d = d.split("\0"); return {currency: d[0], issuer: d[1]}; });
    currencies.push({currency: "XRP"});

    rates(currencies, function(error, rates) {
      var rateByCurrency = {};
      rates.forEach(function(rate) {
        rateByCurrency[rate.counter.currency + "\0" + (rate.counter.issuer || "")] = rate;
      });

      var transactionsByDestination = uniqueDestinations(transactions, key),
          source = {account: a.map(function(d) { return d.account; }).join(", ")},
          targets = [],
          maxSum = -Infinity;

      for (var id in transactionsByDestination) {
        var tx = transactionsByDestination[id],
            target = {account: id, transactions: tx},
            sum = 0,
            balance = 0;

        tx.forEach(function(t) {
          t.currencyAmount = t.amount;
          var rate = rateByCurrency[t.currency + "\0" + t.issuer],
              value = rate ? t.amount / rate.rate : t.amount;
          t.value = t.amount = value;
          balance += value;
          sum += Math.abs(t.value);
        });
        target.firstDate = tx[0].time;
        target.sum = sum;
        target.balance = balance;
        if (sum > maxSum) maxSum = sum;
        targets.push(target);
      }

      d3.select("#target-count").text(targets.length);

      radius.domain([0, maxSum]);

      targets.sort(function(a, b) { return b.firstDate - a.firstDate; });
      targets.forEach(function(d, i) { d.index = i; });
      linkDistance.domain([now, targets[targets.length - 1].firstDate]);
      targets.sort(function(a, b) { return d3.descending(a.sum, b.sum); });

      svg2.datum(targets).call(scatter);

      if (!svg) return;

      // counterpartiesButton.on("click", function() {
      //   exportCSV(targets, ["account", "balance"]);
      // });

      var sourceCount = a.length;
      a.forEach(function(d, i) { d.index = i; });

      var sourceCircle = svg.append("circle")
          .style("pointer-events", "all")
          .datum(source)
          .call(node)
          .on("click", function() { // chord analysis
            linkDistance.range([200, 300]);
            sourceCircle.transition()
                .duration(750)
                .attr("r", 200);
            svg.selectAll(".source").transition()
                .duration(750)
                .attr("transform", function(d) { return "rotate(" + d.index / sourceCount * 360 + ")translate(175)"; })
            return redraw();
            for (var i = 0; i < a.length; ++i) {
              var A = a[i];
              for (var j = 0; j < a.length; ++j) {
                var B = a[j];
                var chord = A.filter(function(d) { return d.counterparty === B.account || d.account === B.account; });
                if (i !== j && chord.length) svg.append("line")
                    .attr("class", "chord")
                    .attr("x1", 175 * Math.cos(A.index / sourceCount * 2 * Math.PI))
                    .attr("y1", 175 * Math.sin(A.index / sourceCount * 2 * Math.PI))
                    .attr("x2", 175 * Math.cos(B.index / sourceCount * 2 * Math.PI))
                    .attr("y2", 175 * Math.sin(B.index / sourceCount * 2 * Math.PI));
                var ticksG = svg.append("g").attr("class", "chord-ticks");

                var ticks = ticksG.selectAll(".transaction")
                    .data(chord);
                ticks.enter().append("path")
                    .attr("class", "transaction")
                    .attr("d", function(d) { return d.value < 0 ? "M-5,-5L0,0L-5,5" : "M5,-5L0,0L5,5"; })
                    .attr("transform", function(d) {
                    var dx = (linkDistance(d.time) - 250) / 50 * 175;
                      return "translate(" + [
                          dx * Math.cos(A.index / sourceCount * 2 * Math.PI),
                          dx * Math.sin(A.index / sourceCount * 2 * Math.PI)] + ")";
                    });
              }
            }
            redraw();
          });

      redraw();

      function redraw() {
        console.log("Redrawing!");
        var g = svg.selectAll(".counterparty")
            .data(targets);
        var gEnter = g.enter().insert("g", ".node")
            .attr("class", "counterparty")
            .attr("transform", function(d) { return "rotate(" + d.index / targets.length * 360 + ")"; });
        gEnter.insert("line")
            .attr("x1", linkDistance.range()[0])
            .attr("x2", linkDistance.range()[0]);
        g.select("line").transition()
            .duration(750)
            .attr("x1", linkDistance.range()[0])
            .attr("x2", function(d) { return linkDistance(d.firstDate); });
        gEnter.append("a")
            .attr("xlink:href", function(d) { return "#" + d.account; })
          .append("circle")
            .call(node);
        g.select("circle").transition()
            .duration(750)
            .attr("transform", function(d) { return "translate(" + linkDistance(d.firstDate) + ")"; })
          .transition()
            .duration(750)
            .attr("r", function(d) { return radius(d.sum); });

        // Add source accounts
        var circle = svg.selectAll(".source").data(a);
        circle.enter().append("circle")
            .attr("class", "source")
            .attr("r", 5.5)
            .attr("transform", function(d, i) { return "rotate(" + i / sourceCount * 360 + ")translate(25)"; })
          .on("mousemove", mouseover.mousemove)
            .on("mouseout", mouseover.tooltipHide)
            .on("mouseover", function(d) {
              var source = d.account;
              var pie = d3.layout.pie(),
                  arc = d3.svg.arc();
              g.each(function(d) {
                var sum = 0;
                for (var i = 0; i < d.transactions.length; ++i) {
                  var t = d.transactions[i];
                  if (t.account === source || t.counterparty === source) sum += Math.abs(t.value);
                }
                var f = sum / d.sum;
                d3.select(this).append("path")
                    .datum(pie([f, 1 - f])[0])
                    .attr("transform", "translate(" + linkDistance(d.firstDate) + ")rotate(" + -d.index / targets.length * 360 + ")")
                    .attr("class", "pie")
                    .attr("d", arc.outerRadius(radius(d.sum)));
              });
            })
            .on("mouseleave", function() {
              g.selectAll(".pie").remove();
            });

        var ticksG = g.selectAll(".ticks");
        if (ticksG.empty()) ticksG = g.append("g")
            .attr("class", "ticks");

        var ticks = ticksG.selectAll(".transaction")
            .data(function(d) { return d.transactions; });
        ticks.enter().append("path")
            .attr("class", "transaction")
            .attr("d", function(d) { return d.value < 0 ? "M-5,-5L0,0L-5,5" : "M5,-5L0,0L5,5"; })
        ticks.transition()
            .duration(750)
            .attr("transform", function(d) { return "translate(" + linkDistance(d.time) + ")"; });
        ticks.exit().remove();
      }

      function node(circle) {
        circle
            .attr("class", "node")
            .classed("verified", verified)
            .on("mouseover", mouseover.mousemove)
            .on("mouseout", mouseover.tooltipHide)
            .attr("r", 30.5);
      }
    });
  }

  function scatter(g) {
    var width = 960;
    g.each(function(targets) {
      targets.sort(function(a, b) { return b.firstDate - a.firstDate; });
      var dy = 20,
          g = d3.select(this),
          accounts = targets.map(function(d) { return d.account; }),
          x = d3.time.scale().range([0, width - 120]),
          y = d3.scale.ordinal().rangePoints([dy * targets.length, 0]),
          r = d3.scale.sqrt().range([5, 100]),
          xAxis = d3.svg.axis().scale(x).ticks(8),
          yAxis = d3.svg.axis().orient("left").scale(y).tickValues(accounts).tickFormat(formatAccount);
      d3.select(this.parentNode).attr("height", 150 + dy * targets.length);
      x.domain([d3.min(targets, function(d) { return d.firstDate; }), now]).nice();
      y.domain(accounts);
      r.domain([0, d3.max(targets, function(d) { return d3.max(d.transactions, function(d) { return d.value; }); })]);
      var targetById = {};
      targets.forEach(function(d) { targetById[d.account] = d; });
      g.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + y.range()[0] + ")")
          .call(xAxis);
      g.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .selectAll("text")
          .each(function(id) {
            d3.select(this.parentNode).append("a")
                .attr("xlink:href", "#" + id)
              .node()
                .appendChild(this);
          })
          .classed("verified", function(id) { return identities.hasOwnProperty(id); })
          .on("mouseover", function(id) {
            mouseover.mousemove(targetById[id]);
            target.classed("fade", function(d) {
              return d.account !== id;
            });
          });
      var target = g.selectAll(".target")
          .data(targets)
        .enter().append("g")
          .attr("class", "target fade")
          .classed("verified", verified)
          .attr("transform", function(d) { return "translate(0," + y(d.account) + ")"; })
          .sort(function(a, b) { return d3.descending(a.value, b.value); });
      target.selectAll(".node")
          .data(function(d) { return d.transactions; })
        .enter().append("circle")
          .attr("class", function(d) { return "node " + d.type; })
          .attr("cx", function(d) { return x(d.time); })
          .attr("r", 10.5)
          .on("mouseover", function(d) {
            mouseover.tooltipShow();
            d3.select("jebloom-tooltip").selectAll("*").remove();
            var info = d3.select("jebloom-tooltip").append("div").append("ul");
            info.append("li").text("Amount: " + currencyFormat(d.amount));
            info.append("li").text("Currency: " + d.currency);
            if (d.issuer) info.append("li").text("Issuer: " + d.issuer);
            info.append("li").text("Type: " + d.type);
            info.append("li").text("Date: " + d.time);
          })
        .transition()
          .duration(750)
          .attr("r", function(d) { return r(Math.abs(d.amount)); });
      target.append("text")
          .attr("x", x.range()[1] + 100)
          .attr("text-anchor", "end")
          .attr("dy", ".3em")
          .text(function(d) { return currencyFormat(d.balance); });
      target.append("line")
          .attr("x2", width);
    });
  }

  var bases = ["USD"],
      BITSTAMP = "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B";

  function rates(currencies, callback) {
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

  function uniqueDestinations(transactions, key) {
    key = key || function(d) { return d.counterparty; };
    var transactionsByDestination = {};
    transactions.forEach(function(t) {
      var destination = key(t);
      if (destination == null) return;
      (transactionsByDestination.hasOwnProperty(destination)
          ? transactionsByDestination[destination]
          : transactionsByDestination[destination] = []).push(t);
    });
    return transactionsByDestination;
  }

  var isoDate = d3.time.format.iso,
      now = Date.now();

  var linkDistance = d3.scale.log().range([30.5, 200]),
      radius = d3.scale.sqrt().range([5, 100]);

  var format = d3.format(",.2f");

  function currencyFormat(d) {
    return format(d) + " USD";
  }

  function formatAccount(d) {
    return contacts[d] || identities[d] || d;
  }

  function verified(d) {
    return identities.hasOwnProperty(d.account);
  }

}