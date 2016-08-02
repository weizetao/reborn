var rebornControllers = angular.module('rebornControllers', ['ui.bootstrap', 'ngResource', 'highcharts-ng']);

rebornControllers.config(['$interpolateProvider',
    function($interpolateProvider) {
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');
    }
]);

rebornControllers.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);

rebornControllers.factory('ServerGroupsFactory', ['$resource', function ($resource) {
    return $resource('http://localhost:18087/api/server_groups', {}, {
        query: { method: 'GET', isArray: true },
        create : { method: 'PUT' }
    });
}]);

rebornControllers.factory('ProxyStatusFactory', ['$resource', function ($resource) {
    return $resource('http://localhost:18087/api/proxy', {}, {
        query: { method: 'GET', url : 'http://localhost:18087/api/proxy/list', isArray: true },
        setStatus: { method: 'POST' }
    });
}]);

rebornControllers.factory('RedisStatusFactory', ['$resource', function ($resource) {
    return $resource('http://localhost:18087/api/redis', {}, {
        stat: { method: 'GET', url : 'http://localhost:18087/api/redis/:addr/stat' },
        slotInfoByGroupId : { method : 'GET', url: 'http://localhost:18087/api/redis/group/:group_id/:slot_id/slotinfo'}
    });
}]);

rebornControllers.factory('MigrateStatusFactory', ['$resource', function ($resource) {
    return $resource('http://localhost:18087/api/migrate/status', {}, {
        query: { method: 'GET' },
        tasks: { method: 'GET', url: 'http://localhost:18087/api/migrate/tasks', isArray: true},
        doMigrate : { method:'POST', url:'http://localhost:18087/api/migrate'},
        removePendingTask : {method : 'DELETE', url: 'http://localhost:18087/api/migrate/pending_task/:id/remove', params : { id : '@id'} },
        stopRunningTask : {method : 'DELETE', url: 'http://localhost:18087/api/migrate/task/:id/stop', params : { id : '@id'} },
        rebalanceStatus : { method:'GET', url: 'http://localhost:18087/api/rebalance/status'},
        doRebalance: {method:'POST', url: 'http://localhost:18087/api/rebalance'},
    });
}]);

rebornControllers.factory('SlotFactory', ['$resource', function ($resource) {
    return $resource('http://localhost:18087/api/slot', {}, {
        rangeSet: { method: 'POST' }
    });
}]);

rebornControllers.factory('ServerGroupFactory', ['$resource', function ($resource) {
    return $resource('http://localhost:18087/api/server_group/:id', {}, {
        show: { method: 'GET', isArray: true },
        delete: { method: 'DELETE', params: {id: '@id'} },
        addServer: { method: 'PUT', url: 'http://localhost:18087/api/server_group/:id/addServer', params :{ id : '@group_id' } },
        deleteServer :{ method : 'PUT', url: 'http://localhost:18087/api/server_group/:id/removeServer', params :{ id : '@group_id' } },
        promote :{ method : 'POST', url: 'http://localhost:18087/api/server_group/:id/promote', params :{ id : '@group_id' } }
        // no update here, just delete and create, :)
    });
}]);

rebornControllers.controller('rebornProxyCtl', ['$scope', '$http', 'ProxyStatusFactory',
function($scope, $http, ProxyStatusFactory) {
    $scope.proxies = ProxyStatusFactory.query();

    $scope.setStatus = function (p, status) {
        var text = ""
        if (status == "online") {
            text = "Do you want to set " + p.id + " online?";
        } else {
            text = "Do you want to mark " + p.id + " offline? the proxy process will exit after you marked it offline"
        }
        var sure = confirm(text);
        if (!sure) {
            return
        }

        p.state = status
        ProxyStatusFactory.setStatus(p, function() {
          $scope.proxies = ProxyStatusFactory.query();
        },function(failedData) {
          p.state = "offline"
          alert(failedData.data)
        })
    }

    $scope.refresh = function() {
        $scope.proxies = ProxyStatusFactory.query();
    }

}]);

rebornControllers.controller('rebornOverviewCtl', ['$scope', '$http', '$timeout',
function($scope, $http, $timeout) {

    var refreshChart = function(data) {
      var seriesArray = $scope.chartOps.series[0].data;

      if (seriesArray.length > 20) {
          seriesArray.shift();
      }
      seriesArray.push({
        x : new Date(),
        y : data
      });
      $scope.chartOps.series[0].data = seriesArray;
    }

    $scope.refresh = function() {
        $http.get('http://localhost:18087/api/overview').success(function(succData) {
            var keys = 0;
            var memUsed = 0;
            var dataUsed = 0;
            var redisData = succData["redis_infos"];
            for (var i in redisData) {
                var info = redisData[i];
                for (var k in info) {
                    if (k.indexOf('db') == 0) {
                        keys += parseInt(info[k].match(/keys=(\d+)/)[1]);
                    }
                    if (k == 'used_memory') {
                        memUsed += parseInt(info[k])
                    }
                    if (k == 'rocksdb_data_size') {
                        dataUsed += parseInt(info[k])
                    }
                }
            }
            $scope.memUsed = (memUsed / (1024.0 * 1024.0)).toFixed(2);
            $scope.dataUsed = (dataUsed / (1024.0 * 1024.0)).toFixed(2);
            $scope.keys = keys;
            $scope.product = succData['product'];
            if (succData['ops'] !== undefined && succData['ops'] >= 0) {
                $scope.ops = succData['ops'];
            } else {
                $scope.ops = 0;
            }
            refreshChart($scope.ops)
        });
    }
    $scope.refresh();

    $scope.chartOps = {
        options: {
            global: {
                useUTC: false,
            },
            chart: {
                useUTC: false,
                type: 'spline',
            }
        },
        series: [{
            name: 'OP/s',
            data: []
        }],
        title: {
            text: 'OP/s'
        },
        xAxis: {
            type : "datetime",
            title: {
                text: 'Time'
            },
        },
        yAxis: {
            title: {
                text: 'value'
            },

        },
    };

    (function autoUpdate() {
        $timeout(autoUpdate, 1000);
        $scope.refresh();
    }());

}]);

rebornControllers.controller('rebornSlotCtl', ['$scope', '$http', '$uibModal', 'SlotFactory',
function($scope, $http, $uibModal, SlotFactory) {
    $scope.rangeSet = function() {
        var uibModalInstance = $uibModal.open({
            templateUrl: 'slotRangeSetModal',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                $scope.task = {'from': '-1', 'to': '-1', 'new_group': '-1'};

                $scope.ok = function (task) {
                    $uibModalInstance.close(task);
                };

                $scope.cancel = function() {
                    $uibModalInstance.close(null);
                }
            }],
            size: 'sm',
        });

        uibModalInstance.result.then(function (task) {
            if (task) {
                console.log(task);
                SlotFactory.rangeSet(task, function() {
                    alert("success")
                }, function(failedData) {
                    alert(failedData.data)
                })
            }
        });
    }
}]);

rebornControllers.controller('rebornMigrateCtl', ['$scope', '$http', '$uibModal', 'MigrateStatusFactory',
function($scope, $http, $uibModal, MigrateStatusFactory) {
    $scope.migrate_status = MigrateStatusFactory.query();
    $scope.migrate_tasks = MigrateStatusFactory.tasks();
    $scope.rebalance_status = MigrateStatusFactory.rebalanceStatus();

    $scope.migrate = function() {
        var uibModalInstance = $uibModal.open({
            templateUrl: 'migrateModal',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                $scope.task = {'from': '-1', 'to': '-1', 'new_group': '-1', 'delay': 0};
                $scope.ok = function (task) {
                    $uibModalInstance.close(task);
                };
                $scope.cancel = function() {
                    $uibModalInstance.close(null);
                }
            }],
            size: 'sm',
        });

        uibModalInstance.result.then(function (task) {
            if (task) {
                MigrateStatusFactory.doMigrate(task, function() {
                    $scope.refresh();
                }, function(failedData) {
                    alert(failedData.data)
                })
            }
        });
    }

    $scope.rebalance = function() {
        MigrateStatusFactory.doRebalance(function() {
            $scope.refresh()
        }, function (failedData) {
            alert(failedData.data);
        })
    }

    $scope.removePendingTask = function(task) {
        MigrateStatusFactory.removePendingTask(task, function() {
            $scope.refresh();
        }, function (failedData) {
            alert(failedData.data);
        });
    }

    $scope.stopRunningTask = function(task) {
        MigrateStatusFactory.stopRunningTask(task, function() {
            $scope.refresh()
        }, function (failedData) {
            alert(failedData.data);
        })
    }

    $scope.refresh = function() {
        $scope.migrate_status = MigrateStatusFactory.query();
        $scope.migrate_tasks = MigrateStatusFactory.tasks();
        $scope.rebalance_status = MigrateStatusFactory.rebalanceStatus();
    }
}]);

rebornControllers.controller('redisCtl', ['$scope', 'RedisStatusFactory',
function($scope, RedisStatusFactory) {
    $scope.serverInfo = RedisStatusFactory.stat($scope.server);
}]);

rebornControllers.controller('slotInfoCtl', ['$scope', 'RedisStatusFactory', function($scope, RedisStatusFactory){
    $scope.slotInfo = RedisStatusFactory.slotInfoByGroupId({'slot_id': $scope.slot.id, 'group_id': $scope.slot.state.migrate_status.from })
}]);

rebornControllers.controller('rebornServerGroupMainCtl', ['$scope', '$http', '$uibModal', '$log', 'ServerGroupsFactory', 'ServerGroupFactory',
function($scope, $http, $uibModal, $log, ServerGroupsFactory, ServerGroupFactory) {

    $scope.removeServer = function(server) {
        var sure = confirm("are you sure to remove " + server.addr + " from group_" + server.group_id + "?");
        if (!sure) {
            return
        }

        ServerGroupFactory.deleteServer(server, function(succData) {
            $scope.server_groups = ServerGroupsFactory.query();
        }, function(failedData) {
            console.log(failedData.data);
            alert(failedData.data);
        })
    }

    $scope.promoteServer = function(server) {
        ServerGroupFactory.promote(server, function(succData) {
            $scope.server_groups = ServerGroupsFactory.query();
        }, function(failedData) {
            alert(failedData.data);
        })
    }

    $scope.removeServerGroup = function(groupId) {
        var sure = confirm("are you sure to remove group_" + groupId + " ?");
        if (!sure) {
            return
        }

        ServerGroupFactory.delete({ id : groupId }, function() {
            $scope.server_groups = ServerGroupsFactory.query();
        }, function() {
            alert(failedData.data);
        });
    }

    $scope.addServer = function(groupId) {

        var uibModalInstance = $uibModal.open({
            templateUrl: 'addServerToGroupModal',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                  $scope.server = {'addr': '', 'type': 'slave', 'group_id': groupId};
                  $scope.ok = function (server) {
                      $uibModalInstance.close(server);
                  };
                  $scope.cancel = function() {
                      $uibModalInstance.close(null);
                  }
            }],
            size: 'sm',
        });

        uibModalInstance.result.then(function (server) {
            if (server) {
                ServerGroupFactory.addServer(server, function(succData){
                    $scope.server_groups = ServerGroupsFactory.query();
                }, function(failedData) {
                    alert(failedData.data);
                });
            }
        });
    }

    $scope.addServerGroup = function() {
        var uibModalInstance = $uibModal.open({
            templateUrl: 'newServerGroupModal',
            controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
                  $scope.ok = function (group) {
                      $uibModalInstance.close(group);
                  };
                  $scope.cancel = function() {
                      $uibModalInstance.close(null);
                  }
            }],
            size: 'sm',
        });

        uibModalInstance.result.then(function (group) {
            if (group) {
                ServerGroupsFactory.create(group, function(succData) {
                    $scope.server_groups = ServerGroupsFactory.query();
                }, function(failedData) {
                    alert(failedData.data);
                })
            }
        });
    }

    $scope.refresh = function() {
        $scope.server_groups = ServerGroupsFactory.query();
    }

    // query server group
    $scope.server_groups = ServerGroupsFactory.query();
}]);
