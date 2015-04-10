'use strict';

var appDependencies = [
  'ng',
  'ui.router'
];

angular
  .module('app', appDependencies)
  .config(appConfig);

//Controllers
require('./app.controller');
require('./menu.controller');
require('./flow.controller');
require('./counterparties.controller');
require('./dos.controller');

//API
require('./services/api.service');

//Common JS
require('./common/flow.common');
require('./common/cp.common');
require('./common/dos.common');
require('./common/mouseover.common');

$('body').prepend(require('../views/index.jade')());

appConfig.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];

function appConfig ($stateProvider, $urlRouterProvider, $locationProvider) {
  var routes = [
    {
      name: 'main',
      path: ''
    },
    {
      name: 'menu',
      path: 'menu'
    },
    {
      name: 'counterparties',
      path: 'counterparties'
    },
    {
      name: 'flow',
      path: 'flow'
    },
    {
      name: 'dos',
      path: 'dos'
    }
  ];

  routes.forEach(function(route){
    var template = require('../views/' + route.name + '.jade')();

    $stateProvider.state(route.name, {
      url: '/' + route.path,
      views: {
        guest: { template: template }
      }
    });
  });

  $urlRouterProvider.otherwise("/404");
  $locationProvider.html5Mode(true);
}
