'use strict';

angular
  .module('app')
  .service('fof', fof);

fof.$inject = ['$rootScope', 'mouseover'];

function fof($scope, mouseover) {

  var margin = {top: 30, right: 60, bottom: 30, left: 100};
  var width = 1200 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var dateFormat = d3.time.format("%a %d %b %Y %H:%M:%S");

  this.FlowCharts = function(balances) {
    console.log("Checkpoint 1.");
    console.log("Balances:", balances);
    
    var self       = this;
    var currencies = {};
    var currencies2 = {};
    var id         = 0;
    var chart      = d3.select("#chart");
    var dateButton = d3.select("#loadDates");
    var dropdowns  = d3.select("#dropdowns");
    var currency, issuer;
    var currencyList = [];
    var graph;
    var brush;
    var extent, extent2, y, y2, yAxis, yAxis2, line, graphArea, status, dot, x, xAxis, dotY;
    var currencyToLoad, issuerToLoad, transactionList;


    balances.forEach(function(transaction) {

      if (transaction.currency) {
        currency = transaction.currency;
        if (transaction.issuer) {
          issuer = transaction.issuer;
          if (currencies.hasOwnProperty(currency)) {
            (currencies[currency].hasOwnProperty(issuer) ? currencies[currency][issuer] : currencies[currency][issuer] = []).push(transaction);
          }
          else {
            currencies[currency] = {};
            currencies[currency][issuer] = [transaction];
          }
        }
        else {
          (currencies.hasOwnProperty(currency) ? currencies[currency] : currencies[currency] = []).push(transaction);
        }
      }

    });

    currencyList = Object.keys(currencies);

    console.log("Currencies:", currencies);
    console.log("currencyList:", currencyList);

    loadDropdowns();

    function loadDropdowns() {

      var currencySelect   = dropdowns.append("select").attr("class","currency").on("change", changeCurrency);
      var gatewaySelect    = dropdowns.append("select").attr("class","gateway").on("change", changeGateway);
      var selectedCurrency = "XRP";

      var option = currencySelect.selectAll("option")
        .data(currencyList)
        .enter().append("option")
        .attr("class", function(d){return d})
        .property("selected", function(d) { return selectedCurrency && d === selectedCurrency; })
        .text(function(d){return d});  

      changeCurrency();

      function changeCurrency() {
        var currency = currencySelect.node().value;
        var list = currency === "XRP" ? [""] :
              Object.keys(currencies[currency]);

        var option = gatewaySelect.selectAll("option").data(list, String);
        
        option.enter().append("option").text(function(d){return d});
        option.exit().remove();
        if (currency=="XRP") gatewaySelect.attr("disabled", "true");
        else gatewaySelect.attr('disabled', null); 

        changeGateway();
      }

      function changeGateway(){
        currencyToLoad  = currencySelect.node().value;
        if (currencyToLoad === "XRP") {
          transactionList = currencies[currencyToLoad];
        }
        else {
          issuerToLoad    = gatewaySelect.node().value;
          transactionList = currencies[currencyToLoad][issuerToLoad];
        }
        console.log(transactionList);
        drawFlow(transactionList);
      }
    }

    function drawFlow(transactions) {

      chart.html('');

      self.graphWrapper = chart.append("div").attr("id", "chartWrapper");

      self.graph = self.graphWrapper.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      self.graph.append("defs").append("clipPath")
        .attr("id", "clip-"+ ++id)
        .append("rect")
          .attr("width", width)
          .attr("height", height);

      for (var i = 0, b = 0; i<transactions.length; ++i) {
        var t = transactions[i];
        //t.previous = transactions[i - 1];
        //t.next = transactions[i + 1];
        t.amount = t.value - b;
        b = t.value;
      }

      setxAxis();
      extent = d3.extent(transactions, function(d) { return d.value; });
      extent2 = d3.extent(transactions, function(d) { return Math.abs(d.amount) || NaN; });
      y = d3.scale.linear().domain([Math.min(0, extent[0]), Math.max(0, extent[1])]).range([height, 0]);
      y2 = d3.scale.log().domain([Math.max(1, extent2[0]), extent2[1]]).range([height, 0]);
      yAxis = d3.svg.axis().scale(y).orient("left").ticks(height / 20);
      yAxis2 = d3.svg.axis().scale(y2).orient("right").ticks(8, d3.format(".1s"));

      line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.value - d.amount); })
        .interpolate("step-before");

      graphArea = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.value - d.amount); })
        .interpolate("step-before");

      self.graph.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .style("pointer-events", "all");

      var g = self.graph.append("g")
        .attr("clip-path", "url(#clip-" + id + ")");

      status = self.graph.append("text")
          .attr("x", 100)
          .attr("dy", "-1em");

      self.graph.append("text")
          .attr("dy", "-1em")
          .text(transactions[0].currency);

      self.graph.append("g")
          .attr("class", "y axis")
          .call(yAxis);

      self.graph.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate(" + x.range()[1] + ")")
          .call(yAxis2);

      self.graph.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + y.range()[0] + ")")
          .call(xAxis);

      g.append("path")
          .attr("class", "area")
          .attr("d", graphArea(transactions));

      g.append("path")
          .attr("class", "line")
          .attr("d", line(transactions));

      dot = g.selectAll(".dot")
        .data(transactions);
      dot.enter().append("circle")
          .on("mouseover", function(d) {
            mouseover.tooltipShow();
            var tooltip = d3.selectAll('.jeboom-tooltip');
            tooltip.selectAll("*:not(.close)").remove();

            var table = tooltip.append("table");

            var tr = table.append("tr").datum(d.date);
            tr.append("td").text("Date: ");
            tr.append("td").text(dateFormat);

            var tr = table.append("tr").datum(d.amount);
            tr.append("td").text("Balance change: ");
            tr.append("td").each(splitPrice);

            var tr = table.append("tr").datum(d.value);
            tr.append("td").text("Balance: ");
            tr.append("td").each(splitPrice);

            console.log(d);
          })
          .on("mouseout", mouseover.tooltipHide)
          .attr("class", "dot")
          .attr("r", 6.5);
      dot.exit().remove();
      dot.classed("received", function(d) { return d.amount < 0; })
        .attr("transform", function(d) {
          dotY = y2(Math.abs(d.amount));
          if (isNaN(dotY)) dotY = 0;
          return "translate(" + x(d.date) + "," + Math.max(0, dotY) + ")"; 
        });



      var table = self.graphWrapper.append("div")
        .attr("class", "transactions")
        .append("table");

      table.append("thead").append("tr").selectAll("th")
            .data(["Type", "Date", "Counterparty", "Amount"])
            .enter().append("th").text(String);

      var balanceTH = table.select("tr").append("th");
      balanceTH.append("span").text("Balance");

      var tbody = table.append("tbody");

      var tr = tbody.selectAll("tr")
          .data(transactions);
      tr.enter().append("tr");
      tr.append("td").text(function(d) { return d.tx.TransactionType; });
      tr.append("td").text(function(d) { return dateFormat(d.date); });
      tr.append("td").text(function(d) { return d.tx.TransactionType === "Payment" ? d.account === d.tx.Account ? d.tx.Destination : d.tx.Account : ""; });
      tr.append("td").datum(function(d) { return d.amount; }).attr("class", function(d) { return d > 0 ? "received" : "sent"; }).each(splitPrice);
      tr.append("td").datum(function(d) { return d.value; }).each(splitPrice);


      function splitPrice(d) {
        var formatPrice = d3.format(".5f");
        var td = d3.select(this).classed("right", true),
            parts = formatPrice(d).split(/(0+)$/);
        td.append("span").text(parts[0]);
        if (parts[1]) td.append("span").attr("class", "grey").text(parts[1]);
      }

      function draw() {
        self.graph.select(".x.axis").call(xAxis);
        self.graph.select(".y.axis").call(yAxis);
        g.select(".line").attr("d", line(transactions));
        g.select(".area").attr("d", graphArea(transactions));
        g.selectAll(".dot")
            .attr("transform", function(d) {
              dotY = y2(Math.abs(d.amount));
              if (isNaN(dotY)) dotY = 0;
              return "translate(" + x(d.date) + "," + Math.max(0, dotY) + ")"; 
            });
        //hover.attr("transform", "translate(" + x(o.date) + ")");
      }

      function setxAxis(start, end){
        x = d3.time.scale.utc();
        if (!start && !end)
          x.domain(d3.extent(balances, function(d) {
            return d.date; 
          }));
        else if (!start)
          x.domain([
            d3.min(balances, function(d) {
            return d.date;
          }), end]);
        else if (!end)
          x.domain([start,
            d3.max(balances, function(d) {
              return d.date;
            })]);
        else x.domain([new Date(start), new Date(end)]);

        x.range([0, width]);
        xAxis = d3.svg.axis().scale(x);
      }

      dateButton.on("click", function(d){
        //maybe change
        var start = moment(document.getElementById("startDate").value);
        var end   = moment(document.getElementById("endDate").value);
        if (start.isValid() && end.isValid()) {
          setxAxis(start.format(), end.format());
          draw();
        }
        else console.log("Not valid dates");
      });

      d3.select(".loader").remove();
    }


  }

}