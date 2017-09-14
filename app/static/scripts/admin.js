require.config({
    baseUrl : "../../lib",
    paths: {
        "mmstate": "/avalon.oniui-master/mmRouter/mmState",
        "simplegrid": "/avalon.oniui-master/simplegrid/avalon.simplegrid",
        "mmRequest" : "/avalon.oniui-master/mmRequest/mmRequest"
    },
    shim : {
        'echarts' : {
            exports: 'echarts'
        }
    }
});
require(["mmstate","mmRequest","simplegrid"], function() {
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
            if(tostate.stateName == 'admin.echarts'){
                require(['echarts'],function (ec) {
                    var myChart = ec.init(document.getElementById('main'));

                    // 指定图表的配置项和数据
                    var option = {
                        title: {
                            text: 'ECharts 入门示例'
                        },
                        tooltip: {},
                        legend: {
                            data:['销量']
                        },
                        xAxis: {
                            data: ["衬衫","羊毛衫","雪纺衫","裤子","高跟鞋","袜子"]
                        },
                        yAxis: {},
                        series: [{
                            name: '销量',
                            type: 'bar',
                            data: [5, 20, 36, 10, 10, 20]
                        }]
                    };

                    // 使用刚指定的配置项和数据显示图表。
                    myChart.setOption(option);
                })
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
    })
//设置子路由添加类别，这里开始配置右下方主要内容部分
    avalon.state("admin.addSpendType", {
        url: 'admin/addSpendType',
        controller : 'addSpendType',
        views : {
            '' : {
                templateUrl: '/tpl/addSpendType.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 0;
        }
    })
    //设置子路由查看全部类别
    avalon.state('admin.seeAllType', {
        url: 'admin/seeAllType',
        views : {
            '' : {
                templateUrl: '/tpl/seeAllType.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 1;
        }
    })
    //添加消费支出
    avalon.state('admin.addSpending', {
        url: 'admin/addSpending',
        views : {
            '' : {
                templateUrl: '/tpl/addSpending.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 2;
        }
    })
    //查看所有消费
    avalon.state('admin.seeAllSpend', {
        url: 'admin/seeAllSpend',
        views : {
            '' : {
                templateUrl: '/tpl/seeAllSpend.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 3;
        }
    });
    //图表echarts
    avalon.state('admin.echarts', {
        url: 'admin/echarts',
        views : {
            '' : {
                templateUrl: '/tpl/echarts.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 4;

        }
    })
    //添加管理员
    avalon.state('admin.addAdmin',{
        url: 'admin/addAdmin',
        views : {
            '' : {
                templateUrl: '/tpl/addAdmin.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 5;
        }
    })
    //添加管理员
    avalon.state('admin.manageAccount',{
        url: 'admin/manageAccount',
        views : {
            '' : {
                templateUrl: '/tpl/manageAccount.html'
            }
        },
        onEnter : function () {
            avalon.vmodels['navCtrl'].currentIndex = 6;
        }
    })
    //启动路由
    avalon.history.start({
        // basepath : '/'
    });
    //go!!!!!!!!!
    avalon.scan();
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
        },
        currentIndex : 0,
        isActive : function(j){
            navCtrlVm.currentIndex=j;
        }
    });
    //添加类别
    var addSpendTypeVm = avalon.define({
        $id : "addSpendType",
        typeName : '',
        addType : function (e){
            e.preventDefault();
            if(addSpendTypeVm.typeName == ""){
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
    //查看所有类别
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

    //查看消费
    function getSpendData(url) {
        avalon.ajax({
            url : url,
            dataType : 'json',
            type :'get',
            success :function (data) {

                var seeAllSpendVm = avalon.define("seeAllspend", function (vm){
                    vm.num= data.length;
                    for(var i=0;i<data.length;i++){
                        var j =i;
                        data[i].number = ++j;
                        data[i].purchaserDate = new Date(data[i].purchaserDate).toLocaleDateString().replace(/\//g, '-');
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
    getTypeData('/seeAlltype');//异步的时候表格无法初始化，同步也不行
    getSpendData('/seeAllSpend');

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
    });
    addSpendVm.gettypeArr();

    //添加管理员
    var addAdmin = avalon.define({
        $id : 'addAdmin',
        formData : { //属性使用时须先定义，不然拿不到值。（angular有当前作用域，不用定义可直接使用。）
            uName: '',
            psw: '',
            pswAgain :''
        },
        addAdmin : function (e) {
            e.preventDefault();
            if (addAdmin.formData.psw !== addAdmin.formData.pswAgain) {
                alert("两次密码输入不一致");
                return;
            }
            var form = {
                username : addAdmin.formData.uName,
                password : addAdmin.formData.psw

            };
            avalon.ajax({
                url : '/addAdmin',
                dataType : 'json',
                type :'post',
                contentType	: "application/json",
                data : JSON.stringify(form),
                success :function (data) {
                    alert(data.success);
                    for(key in addAdmin.formData){
                        addAdmin.formData[key]='';
                    }
                },
                error :function () {
                    alert('添加用户失败');
                }
            })
        }
    });

    //更改密码
    var manageUser = avalon.define({
        $id : 'manageUser',
        formData : { //属性使用时须先定义，不然拿不到值。（angular有当前作用域，不用定义可直接使用。）
            uName: '',
            pswOld :'',
            psw: '',
            pswAgain :''
        },
        manageAccount : function (e) {
            e.preventDefault();
            if (manageUser.formData.psw !== manageUser.formData.pswAgain) {
                alert("两次密码输入不一致");
                return;
            }
            var form = {
                username : manageUser.formData.uName,
                password : manageUser.formData.psw,
                pswOld: manageUser.formData.pswOld

            };
            avalon.ajax({
                url : '/manageAccount',
                dataType : 'json',
                type :'post',
                contentType	: "application/json",
                data : JSON.stringify(form),
                success :function (data) {
                    if(data.ret === 1000){
                        alert("修改密码失败");
                        return;
                    }
                    alert(data.success);
                    for(key in manageUser.formData){
                        manageUser.formData[key]='';
                    }
                },
                error :function (data) {
                    alert(JSON.parse(data.responseText).success);
                }
            })
        }
    });
})

