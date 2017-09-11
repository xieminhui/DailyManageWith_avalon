///用于设置路由

require(["./mmRouter/mmState"], function() {
    avalon.define({       //这个一定要写再里面
        $id     :       'adminIndex'
    });

    avalon.state.config({
        onBeforeUnload: function (formstate, tostate) {
            // if(tostate.stateName == 'admin'){
            //     avalon.router.go('admin.addSpendType');
            // }
        },
        onError: function() {
            //   console.log(arguments)
        }, // 强烈打开错误配置
        onLoad : function (fromstate, tostate) {
            if(tostate.stateName == 'admin'){//这个很烦，如果不主动切换过去，登录进去后右边页面不会自动跳到第一个选项“添加类别”
                avalon.router.go('admin.addSpendType');
            }
        }
    });
    avalon.router.error(function() {
        //avalon.router.navigate('/index');
        avalon.router.go('admin.addSpendType');//其他路由选项，直接跳到定义的第一个li
    })
    avalon.state('admin', {
        url: '/',
        views: {
            //顶层部分
            '': {
                templateUrl: '/tpl/indexAdmin.html'
            },
            //左侧导航部分
            'navSideBar@admin': { //footer部分
                templateUrl: '/tpl/navSideBar.html'
            }
        },
        onEnter : function () {
            // avalon.router.redirect('/admin/addSpendType');
        },
        onExit : function () {
            avalon.router.go('admin.addSpendType');
        }
    });
//设置子路由添加类别，这里开始配置右下方主要内容部分
    avalon.state('admin.addSpendType', {
        url: 'addSpendType',
        controller : 'addSpendType',
        views : {
            '' : {
                templateUrl: '/tpl/addSpendType.html'
            }
        }
    })
    //设置子路由查看全部类别
    avalon.state('admin.seeAllType', {
        url: 'admin/seeAllType',
        views : {
            '' : {
                templateUrl: '/tpl/seeAllType.html'
            }
        }
    })
    //添加消费支出
    avalon.state('admin.addSpending', {
        url: 'admin/addSpending',
        views : {
            '' : {
                templateUrl: '/tpl/addSpending.html'
            }
        }
    })
    //查看所有消费
    avalon.state('admin.seeAllSpend', {
        url: 'admin/seeAllSpend',
        views : {
            '' : {
                templateUrl: '/tpl/seeAllSpend.html'
            }
        }
    })
    //图表echarts
    avalon.state('admin.echarts', {
        url: 'admin/echarts',
        views : {
            '' : {
                templateUrl: '/tpl/echarts.html'
            }
        }
    })
    //添加管理员
    avalon.state('admin.addAdmin',{
        url: 'admin/addAdmin',
        views : {
            '' : {
                templateUrl: '/tpl/addAdmin.html'
            }
        }
    })
    //添加管理员
    avalon.state('admin.manageAccount',{
        url: 'admin/manageAccount',
        views : {
            '' : {
                templateUrl: '/tpl/manageAccount.html'
            }
        }
    })
    //启动路由
    avalon.history.start({
        // basepath : '/'
    });
    //go!!!!!!!!!
    avalon.scan();

})
//后台页面控制器
var navCtrlVm = avalon.define({
    $id : 'navCtrl',
    navGroups : [{
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
    }],
    active : 'active',
    addActive : function (e) {
        var all = document.getElementsByClassName('nav-sidebar')[0].children;
        var li = e.target;
        for(var i = 0; i<all.length;i++){
            avalon(all[i].children[0]).removeClass('active');
        }
        avalon(li).addClass('active');
    },
    initActive : function () {
        var all = document.getElementsByClassName('nav-sidebar')[0].children;
        avalon(all[0].children[0]).addClass('active');
    },
    rendered : function () {
        navCtrlVm.initActive();
    }
});

//添加类别
var addSpendTypeVm = avalon.define({
    $id : "addSpendType",
    typeName : '',
    addType : function (e){
        e.preventDefault();
        if(addSpendTypeVm.typeName == ''){
            return;
        }
        var formData = {
            typeName: addSpendTypeVm.typeName
        };
        fetch('/addSpendType',{
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).then(function successCallback(response) {
            if (response.status === 200) {
                addSpendTypeVm.typeName = "";
                response.json().then(function(data) {
                    alert(data.success);
                });
            }
        }, function errorCallback(response) {
            alert("添加类别失败");
        });
    }
})

//require表格simplegrid
require(["./smartgrid/avalon.smartgrid"], function () {
    function  getData(url) {
        var data = null;
        fetch(url,{
            method: 'get',
            headers: {
                'Accept': 'application/json'
            }
        }).then(function successCallback(response) {
            if (response.status === 200) {
                addSpendTypeVm.typeName = "";
                response.json().then(function(data) {
                    data = data;
                });
            }
        }, function errorCallback(response) {
            alert("获取数据失败");
        });
        return data;
    }

    //查看所有类别
    avalon.define("seeAlltype", function(vm){
        vm.smartgrid = {
            columns : [
                {key: "Sort_id", name: "ID", sortable : true, align: "center", width: "10%"},
                {key: "Sort_name", name: "类别名", sortable : true, align: "center", width: "10%"}
            ],

            data : getData('/seeAlltype')
        }
        vm.$skipArray = ["smartgrid"]
    })
    avalon.scan();
})