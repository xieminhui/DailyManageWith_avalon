'use strict';

//为adminApp模块（后台管理）定义控制器
adminApp.controller('adminCtrl', ['$scope', '$http', function($scope, $http) {

}]);

//后台管理模块左侧导航栏控制器
adminApp.controller('navCtrl', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        /**
         * 需求：默认为显示导航第一个功能，点击导航切换右侧页面，且高亮当前导航项
         */

        //设定功能名称
        var navGroups = [{
            navName: '添加类别', //显示的名称
            urlName: 'addSpendType' //对应URL的名称
        }, {
            navName: '管理全部类别',
            urlName: 'seeAllType'
        }, {
            navName: '添加消费支出',
            urlName: 'addSpending'
        }, {
            navName: '管理全部消费',
            urlName: 'seeAllSpend'
        }, {
            navName: '统计分析',
            urlName: 'echarts'
        }, {
            navName: '添加管理员',
            urlName: 'addAdmin'
        }, {
            navName: '更改密码',
            urlName: 'manageAccount'
        }];
        $scope.navGroups = navGroups;
    }
]);

//添加类别
adminApp.controller('addSpendType', ['$scope', '$http',
    function($scope, $http) {
        //检验通过
        $scope.addType = function(valid, event) {
            $scope.formData = {
                typeName: $scope.typeName
            };
            if (valid) {
                //发送数据到后台
                $http({
                    method: 'POST',
                    url: '/addSpendType',
                    headers: {
                        //表单的报头格式
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: $.param($scope.formData) //发送user数据到后台，这里用到了jQ
                }).then(function successCallback(response) {
                    if (response.status === 200) {
                        $scope.typeName = "";
                        alert(response.data.success);
                    }
                }, function errorCallback(response) {
                    alert("添加类别失败");
                });
            }
        }
    }
]);

//查看全部类别
adminApp.controller('seeAllType', ['$scope', '$http',
    function($scope, $http) {
        //异步获取页面数据
        $scope.getPagedDataAsync = function(pageSize, page, searchText) {
            setTimeout(function() {
                var data;
                if (searchText) {
                    var ft = searchText.toLowerCase();
                    //获取模拟的书籍json文件
                    $http.get('/seeAllType')
                        .success(function(largeLoad) {
                            data = largeLoad.filter(function(item) {
                                return JSON.stringify(item).toLowerCase().indexOf(ft) != -1;
                            });
                            $scope.setPagingData(data, page, pageSize);
                        });
                } else {
                    $http({
                        method: 'GET',
                        url: '/seeAllType'
                    }).then(function successCallback(response) {
                        if (response.status === 200) {
                            for(var i=0;i<response.data.length;i++){
                                response.data[i].modify = 1;
                                response.data[i].dele = 1;
                            }
                            $scope.spendTypes = response.data;

                         //    $scope.setPagingData(response.data, page, pageSize);
                        }
                    }, function errorCallback(response) {
                        alert("获取类别数据失败");
                    });
                }
            }, 100);
        };

        $scope.getPagedDataAsync();

        $scope.gridOptions = {
            data: 'spendTypes',
           // rowTemplate: '<div style="height: 100%"><div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
           //     '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }"> </div>' +
           //      '<div ng-cell></div>' +
           //     '</div></div>',
            showGridFooter: true,
            enableSorting: true,
            columnDefs: [{
                name: 'Sort_id',
                displayName: 'id',
                width: '10%',
                // width: 10%,
                pinnable: true,
                sortable: true,
                enableCellEdit: false
            }, {
                name: 'Sort_name',
                displayName: '类别名',
                enableCellEdit: true,
                // width: 220
                width: '30%'
            }, {
                name: 'modify',
                displayName: '修改',
                enableCellEdit: false,
                sortable: false,
                pinnable: false,
                width: '30%',
                // width: 120,
                cellTemplate: '<div><a class="btn btn-xs btn-success feng-btn-modify" ng-click="grid.appScope.updateType(row)"  data="{{grid.getCellValue(row,col)}">确认修改</a></div>'
            }, {
                name: 'dele',
                displayName: '删除',
                enableCellEdit: false,
                sortable: false,
                pinnable: false,
                // width: 120,
                width: '30%',
                cellTemplate: '<div><a class="btn btn-xs btn-danger feng-btn-delete" ng-click="grid.appScope.deleteType(row)" data="{{grid.getCellValue(row,col)}">删除</a></div>'
                    //ng-click时间触发的时候传入row
            }],
            paginationPageSizes :[5, 10, 20],
            paginationPageSize: 10
        };

        $scope.updateType = function(row) {
            //包装数据传递到后台
            var obj = {
                id: row.entity.Sort_id,
                typeName: row.entity.Sort_name
            };
            // console.log($.param(obj))
            $http.put('/seeAllType/' + obj.id, obj).success(function(data, status) {
                if (status === 200) {
                    alert(data.success);
                }
            });
        };

        $scope.deleteType = function(row) {
            $http.delete('/seeAllType/' + row.entity.Sort_id).success(function(data, status) {
                if (status === 200) {
                    $scope.getPagedDataAsync();
                    alert(data.success);
                }
            });
        };
    }
]);

//添加消费支出
adminApp.controller('addSpending', ['$scope', '$http','$filter',
    function($scope, $http,$filter) {
        //对类别进行加载
        $http.get('/seeAllType')
            .success(function(largeLoad) {
                $scope.types = largeLoad;
            });

        //提交的时候
        $scope.addspend = function(valid, event) {
            $scope.formData = {
                //bookName: $scope.bookName,
                purchaser: $scope.purchaser,
                typeId: $scope.typeId, //类别
                price: $scope.price,
                purchaserPlace: $scope.purchaserPlace,
                purchaserDate: $filter('date')($scope.purchaserDate, 'yyyy-MM-dd'),
               // sum: $scope.sum,
                currentNum: $scope.currentNum,
                brief: $scope.brief
                    //缺少imageName,buyDate
            };

            //检验通过
            if (valid) {
                //发送数据到后台
                $http({
                    method: 'POST',
                    url: '/addSpending',
                    headers: {
                        //表单的报头格式
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: $.param($scope.formData) //发送user数据到后台，这里用到了jQ
                }).then(function successCallback(response) {
                    if (response.status === 200) {
                        //添加成功，清空输入项
                        for (var p in $scope.formData) {
                            $scope[p] = '';
                        }
                        alert(response.data.success);
                    }
                }, function errorCallback(response) {
                    alert("添加类别失败");
                });
            }
        }
    }
]);

//查看全部消费
adminApp.controller('seeAllSpend', ['$scope', '$http','$filter',
    function($scope, $http,$filter) {
        $scope.filterOptions = {
            filterText: "",
            useExternalFilter: true
        };
        $scope.totalServerItems = 0;
        $scope.pagingOptions = {
            pageSizes: [5, 10, 50],
            pageSize: 10,
            currentPage: 1
        };

        //设置页面数据
        $scope.setPagingData = function(data, page, pageSize) {
            for(var i=0;i<data.length;i++){
                data[i].purchaserDate = new Date(data[i].purchaserDate).toLocaleDateString().replace(/\//g, '-');
            }

            var pagedData = data.slice((page - 1) * pageSize, page * pageSize);
            $scope.spend = pagedData;
            $scope.totalServerItems = data.length;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        //异步获取页面数据
        $scope.getPagedDataAsync = function(pageSize, page, searchText) {
            setTimeout(function() {
                var data;
                if (searchText) {
                    var ft = searchText.toLowerCase();
                    //获取模拟的书籍json文件
                    $http.get('/seeAllSpend')
                        .success(function(largeLoad) {
                            data = largeLoad.filter(function(item) {
                                return JSON.stringify(item).toLowerCase().indexOf(ft) != -1;
                            });
                            $scope.setPagingData(data, page, pageSize);
                        });
                } else {
                    $http({
                        method: 'GET',
                        url: '/seeAllSpend'
                    }).then(function successCallback(response) {
                        console.log(response);
                        if (response.status === 200) {
                            for(var i=0;i<response.data.length;i++){
                                response.data[i].purchaserDate = new Date(response.data[i].purchaserDate);
                            }
                            $scope.spend = response.data;
                            // $scope.setPagingData(response.data, page, pageSize);
                        }
                    }, function errorCallback(response) {
                        alert("获取数据失败");
                    });
                }
            }, 100);
        };

        $scope.getPagedDataAsync();

        // //监听排序等
        // $scope.$watch('pagingOptions', function(newVal, oldVal) {
        //     if (newVal !== oldVal && newVal.currentPage !== oldVal.currentPage) {
        //         $scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText);
        //     }
        // }, true);
        // $scope.$watch('filterOptions', function(newVal, oldVal) {
        //     if (newVal !== oldVal) {
        //         $scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText);
        //     }
        // }, true);

        $scope.gridOptions = {
            data: 'spend',
            enableColumnResizing: true,
            // rowTemplate: '<div style="height: 100%"><div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
            //     '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }"> </div>' +
            //     '<div ng-cell></div>' +
            //     '</div></div>',
            // multiSelect: false,
            // enableCellSelection: true,
            // enableRowSelection: false,
            // enableCellEdit: true, //双击修改，单击选中
            // enablePinning: true, //列固定
            // enableColumnResize: true, //可以更改列宽度
            columnDefs: [{
                field: 'id',
                displayName: 'id',
                width: '5%',
                pinnable: true,
                sortable: true,
                enableCellEdit: false
            }, {
                field: 'purchaser',
                displayName: '购买者',
                pinnable: true,
                sortable: true,
                enableCellEdit: true,
                width: '10%'
            }, {
                field: 'Sort_name',
                displayName: '类别',
                pinnable: true,
                sortable: true,
                enableCellEdit: false,
                width: '10%'
            }, {
                field: 'Sort_id',
                displayName: '类别id',
                visible: false //隐藏列，方便后面修改数据
            }, {
                field: 'Price',
                displayName: '价格',
                enableCellEdit: true,
                width: '5%'
            }, {
                field: 'purchaserPlace',
                displayName: '购买地点',
                enableCellEdit: true,
                width: '10%'
            }, {
                field: 'purchaserDate',
                displayName: '购买日期',
                type: 'date',
                enableCellEdit: true,
                cellFilter: 'date:"yyyy-MM-dd"', //过滤器，格式化日期
                width: '15%'
            }, {
                field: 'Current_num',
                displayName: '购买数量',
                enableCellEdit: true,
                width: '10%'
            }, {
                field: 'Brief',
                displayName: '简介',
                enableCellEdit: true,
                width: '25%'
            }, {
                field: 'id',
                displayName: '修改',
                enableCellEdit: false,
                sortable: false,
                pinnable: false,
                width: '5%',
                // width: 120,
                cellTemplate: '<div><a class="btn btn-xs btn-success feng-btn-modify" ng-click="grid.appScope.updateSpend(row)"  data="{{grid.getCellValue(row,col)}}">确认修改</a></div>'
            }, {
                field: 'id',
                displayName: '删除',
                enableCellEdit: false,
                sortable: false,
                pinnable: false,
                // width: 120,
                width: '5%',
                cellTemplate: '<div><a class="btn btn-xs btn-danger feng-btn-delete" ng-click="grid.appScope.deleteSpend(row)" data="{{grid.getCellValue(row,col)}}">删除</a></div>'
                    //ng-click时间触发的时候传入row
             }],
            paginationPageSizes :[5, 10, 20],
            paginationPageSize: 10
        };

        $scope.updateSpend = function(row) {
            //包装数据传递到后台
            var obj = {
                id: row.entity.id,
                purchaser: row.entity.purchaser,
                typeId: row.entity.Sort_id, //类别id
                typeName: row.entity.Sort_name, //类别名
                price: row.entity.Price,
                purchaserDate:$filter('date')(row.entity.purchaserDate, 'yyyy-MM-dd'),
                //字符串转化为日期，日期转化为年月日格式
                purchaserPlace: row.entity.purchaserPlace,
                currentNum: row.entity.Current_num,
                brief: row.entity.Brief
                    //缺少imageName,buyDate
            };
            // console.log(obj);
            $http.put('/seeAllSpend/' + obj.id, obj).success(function(data, status) {
                if (status === 200) {
                    alert(data.success);
                }
            });
        };

        $scope.deleteSpend = function(row) {
            $http.delete('/seeAllSpend/' + row.entity.id).success(function(data, status) {
                if (status === 200) {
                    $scope.getPagedDataAsync();
                    alert(data.success);
                }
            });
        };
    }
]);

//echarts图表部分
adminApp.controller("echarts", ['$scope', '$http','$filter',
function ($scope, $http,$filter) {
 //   $scope.data = data;

    $scope.getData = function () {
        $scope.postData = {
            beginTime : $filter('date')($scope.startTime, 'yyyy-MM-dd'),
            endTime   : $filter('date')($scope.stopTime, 'yyyy-MM-dd')
        };
        $http({
            method : 'post',
            url    : '/echartsData',
            headers: {
                //表单的报头格式
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data   : $.param($scope.postData)
        }).then(function (res) {
            $scope.data =  res.data;
           $scope.initEcharts($scope.data);
           $scope.initpie($scope.data);
        //    angular.element('.myecharts').attr('myecharts','');

         //   $scope.$apply();
        });
    };
    $scope.initpie = function (data) {
        var data = [];
        for(var i=0;i<$scope.data.row.xAxis.length;i++){
            data.push({
                'name' : $scope.data.row.xAxis[i],
                'value': $scope.data.row.series[i]
            });
        }
        var chart = angular.element('#pie');
        chart.css({
            'width' : '600',
            'height' : '400'
        });
        var myChart = echarts.init(chart[0]);//不用使用类似jquery对象的angular elemment 对象
        var options = {
            title: {
                text : '支出比例图',
                x: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: "{a} <br/>{b} : {c} ({d}%)"
            },
            legend: {
                orient: 'vectical',
                left: 'left',
                data: $scope.data.row.xAxis
            },
            series: {
                name : '消费类型',
                type : 'pie',
                radius : '55%',
                center : ['50%','60%'],
                data : data,
                itemStyle: {
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        };
        myChart.setOption(options);
    };

    $scope.initEcharts = function (data) {
        var chart = angular.element('.myecharts');
        chart.css({
            'width' : '600',
            'height' : '400'
        });
        var myChart = echarts.init(chart[0]);//不用使用类似jquery对象的angular elemment 对象
        var options = {
            title: {
                text: '消费柱状图'
            },
            tooltip: {
                tirgger : 'axis'
            },
            legend: {
                data:['支出']
            },
            xAxis: {
                data  : $scope.data.row.xAxis
                //data: ["衬衫","羊毛衫","雪纺衫","裤子","高跟鞋","袜子"]
            },
            yAxis: {},
            series: [{
                // itemStyle : {
                //     normal: {
                //         label : {
                //             show: true
                //         }
                //     }
                // },
                name: '支出',
                type: 'bar',
                data : $scope.data.row.series
                //   data: [5, 20, 36, 10, 10, 20]
            }]
        };
        myChart.setOption(options);
    }


}])
    // .directive('myecharts', function () {
    // return {
    //     restrict : 'AE',
    //     //   template : '<div>这是柱图</div>',
    //     replace  : true,
    //     scope : {
    //         data : '@'
    //     },
    //     link     : function ($scope, $element, attr) {
    //         var chart = angular.element('.myecharts');
    //         chart.css({
    //             'width' : '600',
    //             'height' : '400'
    //         });
    //         var myChart = echarts.init(chart[0]);//不用使用类似jquery对象的angular elemment 对象
    //         var options = {
    //             title: {
    //                 text: 'ECharts 入门示例'
    //             },
    //             tooltip: {},
    //             legend: {
    //                 data:['销量']
    //             },
    //             xAxis: {
    //                 data  : $scope.data.row.xAxis
    //                 //data: ["衬衫","羊毛衫","雪纺衫","裤子","高跟鞋","袜子"]
    //             },
    //             yAxis: {},
    //             series: [{
    //                 name: '销量',
    //                 type: 'bar',
    //                 data : $scope.data.row.series
    //              //   data: [5, 20, 36, 10, 10, 20]
    //             }]
    //         };
    //         myChart.setOption(options);
    //
    //     }
    // }
//})

//添加管理员
adminApp.controller('addAdmin', ['$scope', '$http',
    function($scope, $http) {
        //检验通过
        $scope.addAdmin = function(valid, event) {
            if ($scope.psw !== $scope.pswAgain) {
                alert("两次密码输入不一致");
                return;
            }
            $scope.formData = {
                username: $scope.uName,
                password: $scope.psw
            };
            if (valid) {
                //发送数据到后台
                $http({
                    method: 'POST',
                    url: '/addAdmin',
                    headers: {
                        //表单的报头格式
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: $.param($scope.formData) //发送user数据到后台，这里用到了jQ
                }).then(function successCallback(response) {
                    if (response.status === 200) {
                        for (var p in $scope.formData) {
                            $scope.uName = $scope.psw = $scope.pswAgain = '';
                        }
                        alert(response.data.success);
                    }
                }, function errorCallback(response) {
                    alert(response.data.success);
                });
            }
        }
    }
]);

//管理当前账号
adminApp.controller('manageAccount', ['$scope', '$http',
    function($scope, $http) {

        //检验通过
        $scope.manageAccount = function(valid, event) {
            if ($scope.psw !== $scope.pswAgain) {
                alert("新密码两次密码输入不一致");
                return;
            }

            $scope.formData = {
                pswOld: $scope.pswOld,
                username: $scope.uName,
                password: $scope.psw
            };
            if (valid) {
                //发送数据到后台
                $http({
                    method: 'POST',
                    url: '/manageAccount',
                    headers: {
                        //表单的报头格式
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data:$.param($scope.formData) //发送user数据到后台，这里用到了jQ
                }).then(function successCallback(response) {
                    if (response.status === 200) {
                        for (var p in $scope.formData) {
                            $scope.uName = $scope.psw = $scope.pswAgain = $scope.pswOld = '';
                        }
                        alert(response.data.success);
                    }
                }, function errorCallback(response) {
                    alert(response.data.success);
                });
            }
        }
    }
]);
