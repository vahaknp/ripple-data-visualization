'use strict';

angular
  .module('app')
  .controller('DosController', DosController);

DosController.$inject = ['$scope', 'api', 'dos', 'mouseover'];

function DosController ($scope, api, dos, mouseover)
{

  (function() {

    var status = d3.select('.status');

    var abortable = [];

    var legs = [];

    var width = 960,
        height = 500;

    var force = d3.layout.force()
        .charge(-120)
        .linkDistance(width * .1)
        .gravity(0)
        .size([width, height])
        .on("tick", function() {
          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

          linkMouse
              .attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

          node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });

    var nodes,
        links,
        nodeByAccount,
        linkByAccounts;

    var node = d3.select(null),
        link = d3.select(null),
        linkMouse = d3.select(null);

    var svg = d3.select("#paths").append("svg")
        .attr("width", width)
        .attr("height", height);

    var svg2 = d3.select("#transactions").append("svg")
        .attr("width", width + 380)
        .style("margin-left", "-100px")
      .append("g")
        .attr("transform", "translate(350,100)");

    d3.select("#wallets").on("submit", function() {
      d3.event.preventDefault();
      load();
    });

    function load() {
      var xhr;
      while (xhr = abortable.pop()) xhr.abort();
      var wallets = [];
      d3.selectAll(".wallet").each(function() { 
        if (this.value.length > 30 && this.value.length < 40 && this.value[0] === "r") {
          wallets.push(this.value);
        }
        else {
          wallets = [];
          status.html('Please enter valid Ripple Addresses.');
          console.log("nonez");
          return;
        }
      });

      if (wallets.length === 2) {

        status.html('');

        nodeByAccount = {};
        linkByAccounts = {};
        nodes = [];
        links = [];

        wallets.forEach(function(d, i) {
          var node = {account: d, fixed: true, x: width * (i ? .75 : .25), y: height / 2, depth: 0, label: i ? "B" : "A", children: []};
          nodes.push(node);
          nodeByAccount[d] = node;
          transactions(d, updateGraph(1, d3.select("#status-" + i)));
        });

        update();

      }
    }

    function updateGraph(depth, status) {
      var spans = status.selectAll("span");
      if (spans.size() < depth) {
        var span = status.append("span").datum({complete: 0, sum: 1}).text("→ (searching 0/1)");
      } else {
        var span = d3.select(spans[0][depth - 1]),
            d = span.datum();
        ++d.sum;
        span.datum(d).text("→ (searching " + d.complete + "/" + d.sum + ")");
      }
      return function(error, result) {
        console.log("error:", error);
        console.log("result:", result);
        var d = span.datum();
        ++d.complete;
        span.datum(d).text("→ (searching " + d.complete + "/" + d.sum + ")");
        var source = nodeByAccount[result.account],
            targets = uniqueDestinations(result.transactions);
        if (d3.keys(targets).length > 250) return;
        for (var target in targets) {
          var node;
          if (nodeByAccount.hasOwnProperty(target)) {
            node = nodeByAccount[target];
          } else {
            node = nodeByAccount[target] = {account: target, depth: depth, parent: source, label: source.label + "." + source.children.length, children: []};
            nodes.push(node);
            source.children.push(node);
            if (depth < 3) {
              transactions(target, updateGraph(depth + 1, status));
            }
          }
          var key = source.account < target ? source.account + "," + target : target + "," + source.account;
          if (!linkByAccounts.hasOwnProperty(key)) {
            links.push(linkByAccounts[key] = {source: source, target: node, transactions: targets[target]});
          }
        }
        update();
      };
    }

    function update() {

      console.log("Nodes getting passed to kDisjoint:", nodes);

      var onPath = {},
          paths = dos.kDisjoint(nodes, links, nodes[0], nodes[1], Infinity, function(d) { return d.account; });

      onPath[nodes[0].account] = onPath[nodes[1].account] = true;

      paths.forEach(function(d) {
        d.forEach(function(id) { onPath[id] = true; });
      });

      var pathNodes = nodes.filter(function(d) { return onPath[d.account] || d.depth <= 1; }),
          pathLinks = links.filter(function(d) { return onPath[d.source.account] && onPath[d.target.account] || d.source.depth <= 1 && d.target.depth <= 1; });

      force
          .nodes(pathNodes)
          .links(pathLinks)
          .start();

      link = svg.selectAll(".link")
          .data(pathLinks);
      link.enter().insert("line", ".node-group")
          .attr("class", "link");
      link.exit().remove();

      linkMouse = svg.selectAll(".link-mouse")
          .data(pathLinks);
      linkMouse.enter().insert("line", ".link")
          .attr("class", "link-mouse")
          .on("click", function(d) {
            svg2.selectAll("*").remove();
            d.selected = !d.selected;
            link.classed("selected", function(d) { return d.selected; });
            var transactionsByLink = {};
            link.each(function(d) {
              var key = d.source.label < d.target.label
                  ? d.source.label + "→" + d.target.label
                  : d.target.label + "→" + d.source.label;
              if (transactionsByLink.hasOwnProperty(key)) return;
              if (d.selected) {
                (transactionsByLink[key] = d.transactions).forEach(function(t) {
                  t.key = key;
                });
              }
            });
            legs = d3.merge(d3.values(transactionsByLink));
            svg2.call(transactionsChart, null, [d.source.account], legs, function(d) { return d.key; });
          });
      linkMouse.exit().remove();

      node = svg.selectAll(".node-group")
          .data(pathNodes);
      var nodeEnter = node.enter().append("g")
          .attr("class", "node-group")
          .call(force.drag)
          .on("mouseover", mouseover.mousemove)
          .on("click", function() {
            node.on("mouseleave", null).on("mousemove", null);
            d3.select(".jeboom-tooltip button.close")
                .on("click", function() {
                  node.on("mouseleave", mouseover.tooltipHide).on("mousemove", mouseover.mousemove);
                  mouseover.tooltipHide();
                });
          })
          .on("mouseleave", mouseover.tooltipHide);
      nodeEnter.append("circle")
          .attr("class", "node")
          .classed("fixed", function(d) { return !d.depth; })
          .attr("r", 5);
      nodeEnter.append("text")
          .text(function(d) { return d.label; });
      node.exit().remove();
    }

    // TODO just payments for now.
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
      abortable.push(d3.json("//api.ripplecharts.com/api/accountTransactions")
          .header("Content-Type", "application/json")
          .post(JSON.stringify({account: account, offset: offset, startTime: "Jan 1, 2013"}), function(error, result) {
            if (error) return void callback(error);
            var headers = result.shift();
            callback(null, result.map(function(row) {
              var o = {};
              for (var i = 0; i < row.length; ++i) o[headers[i]] = row[i];
              return o;
            }));
          }));
    }

    function uniqueDestinations(transactions) {
      var transactionsByDestination = {};
      transactions.forEach(function(t) {
        var destination = t.counterparty;
        (transactionsByDestination.hasOwnProperty(destination)
            ? transactionsByDestination[destination]
            : transactionsByDestination[destination] = []).push(t);
      });
      return transactionsByDestination;
    }

  })();
  
  function verified(d) {
    return false;
  }

}
