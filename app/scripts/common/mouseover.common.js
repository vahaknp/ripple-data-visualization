'use strict';

angular
  .module('app')
  .service('mouseover', mouseover);

mouseover.$inject = ['$rootScope', 'api'];

  function mouseover($scope, api) {

    console.log("api:", api);

    var tooltip = d3.select("body").append("div")
      .attr("class", "jeboom-tooltip")
      .style("display", "none");

    var identities = {};

    this.mousemove = function(d) {
      show();
      tooltip.selectAll("*:not(.close)").remove();
      var info = tooltip.append("div");
      tooltip.selectAll(".close").data([0]).enter().append("button").attr("class", "close").style("pointer-events", "all").text("×").on("click", hide);
      tooltip.append("p").append("strong").text(formatAccount(d.account));
      if (d.sum) tooltip.append("p").text("Sent/received: " + currencyFormat(d.sum) + " ");
      var id = identities[d.key];
      if (id) {
        var p = tooltip.append("p");
        p.append("span").text("Linked to identity: ");
        p.append("i").text(id);
      }
      if (d.lines) {
        tooltip.append("ul").selectAll("li")
            .data(d.lines)
          .enter().append("li").attr("class", "small")
            .text(function(d) { return d.balance + " " + d.currency; });
      }
      if (d.info) {
        if (d.info.full_name) info.append("h2").text(d.info.full_name);
        if (d.info.photo_url_128x128) info.append("p").append("img").attr("src", d.info.photo_url_128x128);
        if (d.info.address) info.append("p").text(d.info.address);
        if (d.info.country_code) info.append("p").text(d.info.country_code);
      }
      if (!d.loaded) {
        d.loaded = true;

        api.getAccountLines(d.account, function(err, res){
          if (err) console.log("error:", err);
          else{
            d.lines = res.lines;
            tooltip.append("ul").selectAll("li")
              .data(d.lines)
              .enter().append("li").attr("class", "small")
              .text(function(d) { return d.balance + " " + d.currency; });
          }
        });

        d3.json("//ripple-id.3taps.com/get_owner?account_id=" + encodeURIComponent(d.account), function(error, json) {
          if (error || !json.success) return;
          d.info = json.owner;
          if (d.info.full_name) info.append("h2").text(d.info.full_name);
          if (d.info.photo_url_128x128) info.append("p").append("img").attr("src", d.info.photo_url_128x128);
          if (d.info.address) info.append("p").text(d.info.address);
          if (d.info.country_code) info.append("p").text(d.info.country_code);
        });
      }
    }

    this.tooltipShow = function() {
      show();
    }

    this.tooltipHide = function() {
      hide();
    }

    function show() {
      var p = d3.mouse(document.body);
      tooltip
        .style("display", null)
        .style("left", p[0] + 20 + "px")
        .style("top", p[1] - 100 + "px");
    }

    function hide() {
      tooltip.style("display", "none");
    }

    function formatAccount(d) { return d; }

    var format = d3.format(",.2f");

    function currencyFormat(d) {
      return format(d) + " USD";
    }
  
  }