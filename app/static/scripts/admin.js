///用于设置路由
require.config({
    baseUrl : "../../lib/avalon.oniui-master",
    paths: {
        "mmstate": "/mmRouter/mmState",
        "simplegrid": "/simplegrid/avalon.simplegrid",
        "mmRequest" : "/mmRequest/mmRequest"
    }
});
require(["mmstate"], function() {
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


require(['mmRequest'], function () {

    //查看所有类别
    require(["simplegrid"], function () {
        function getTypeData(url) {
            avalon.ajax({
                url : url,
                dataType : 'json',
                type :'get',
                success :function (data) {
                    var seeAlltypeVm = avalon.define("seeAlltype", function (vm){
                        vm.len = data.length;
                        for(var i=0;i<data.length;i++){
                            var j =i;
                            data[i].number = ++j;
                        }
                        vm.$simplegridA = {
                            columns : [
                                {field: 'number', text:'序号',align:"center",width:"10%"},
                                {field: "Sort_id", text: "ID", resizable: true, align: "center", width: "10%"},
                                {field: "Sort_name", text: "类别名", resizable: true, align: "center", width: "10%"}
                            ],
                            data :data
                        };
                        vm.$skipArray = ["simplegrid"];
                    });
                },
                error :function () {
                    alert('获取数据失败');
                }
            })
        }
        getTypeData('/seeAlltype');//异步的时候表格无法初始化，同步也不行

        //查看消费类别
        function getSpendData(url) {
            avalon.ajax({
                url : url,
                dataType : 'json',
                type :'get',
                success :function (data) {
                    var seeAllSpendVm = avalon.define("seeAllspend", function (vm){
                        vm.total = data.length;
                        for(var i=0;i<data.length;i++){
                            var j =i;
                            data[i].number = ++j;
                        }
                        vm.$simplegridB = {
                            columns : [
                                {field: 'number', text:'序号',align:"center",width:"10%"},
                                {field: "id", text: "ID", resizable: true, align: "center", width: "10%"},
                                {field: "purchaser", text: "购买者", resizable: true, align: "center", width: "10%"},
                                {field: "Sort_name", text: "类别名", resizable: true, align: "center", width: "10%"},
                                {field: "Price", text: "价格", resizable: true, align: "center", width: "10%"},
                                {field: "purchaserPlace", text: "购买地点", resizable: true, align: "center", width: "10%"},
                                {field: "purchaserDate", text: "购买日期", resizable: true, align: "center", width: "10%"},
                                {field: "Current_num", text: "购买数量", resizable: true, align: "center", width: "10%"},
                                {field: "Brief", text: "简介", resizable: true, align: "center", width: "10%"}
                            ],
                            data :data
                        };
                        vm.$skipArray = ["simplegrid"];
                    });
                },
                error :function () {
                    alert('获取数据失败');
                }
            })
        }
        getSpendData('/seeAllSpend');
    })
    //添加消费
    var addSpendVm = avalon.define({
        $id : "addSpend",
        typeArr : [],
        formData : {
            purchaser: '',
            typeId: '', //类别
            price: '',
            purchaserPlace: '',
            purchaserDate: '',
            currentNum: '',
            brief: ''
        },
        gettypeArr :function () {
            avalon.ajax({
                url : '/seeAlltype',
                dataType : 'json',
                type :'get',
                success :function (data) {
                    addSpendVm.typeArr = data;
                }
            })
        },
        addspend : function (e) {
            e.preventDefault();
            addSpendVm.formData = {
                purchaser: addSpendVm.formData.purchaser,
                typeId: addSpendVm.formData.typeId, //类别
                price: addSpendVm.formData.price,
                purchaserPlace: addSpendVm.formData.purchaserPlace,
                purchaserDate: addSpendVm.formData.purchaserDate,
                currentNum: addSpendVm.formData.currentNum,
                brief: addSpendVm.formData.brief
            };
            avalon.ajax({
                url : '/addSpending',
                dataType : 'json',
                type :'post',
                contentType	: "application/json",
                data : JSON.stringify(addSpendVm.formData),
                success :function (data) {
                    alert(data.success);
                    for(key in addSpendVm.formData){
                        addSpendVm.formData[key]='';
                    }
                },
                error :function () {
                    alert('添加类别失败');
                }
            })
        }
    })
    addSpendVm.gettypeArr();

    avalon.scan();

})
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
        avalon.ajax({
            url : '/addSpendType',
            dataType : 'json',
            type :'post',
            contentType	: "application/json",
            data : JSON.stringify(formData),
            success :function (data) {
                alert(data.success);
                addSpendTypeVm.typeName = "";
            },
            error :function () {
                alert('添加类别失败');
            }
        })
    }
});

