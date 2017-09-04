///用于设置路由


require(["mmState"], function() {
    avalon.define({       //这个一定要写再里面
        $id     :       'adminIndex'
    });

    avalon.state.config({
        onBeforeUnload: function (formstate, tostate) {

        },
        onError: function() {
            console.log(arguments)
        } // 强烈打开错误配置
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
        }
    });
//设置子路由添加类别，这里开始配置右下方主要内容部分
    avalon.state('admin.addSpendType', {
        url: '/addSpendType',
        templateUrl: '/tpl/addSpendType.html'
    })
    //设置子路由查看全部类别
    avalon.state('admin.seeAllType', {
        url: '/seeAllType',
        templateUrl: '/tpl/seeAllType.html'
    })
    //添加消费支出
    avalon.state('admin.addSpending', {
        url: '/addSpending',
        templateUrl: '/tpl/addSpending.html'
    })
    //查看所有消费
    avalon.state('admin.seeAllSpend', {
        url: '/seeAllSpend',
        templateUrl: '/tpl/seeAllSpend.html'
    })
    //图表echarts
    avalon.state('admin.echarts', {
        url: '/echarts',
        templateUrl: '/tpl/echarts.html'
    })
    //添加管理员
    avalon.state('admin.addAdmin',{
        url: '/addAdmin',
        templateUrl: '/tpl/addAdmin.html'
    })
    //添加管理员
    avalon.state('admin.manageAccount',{
        url: '/manageAccount',
        templateUrl: '/tpl/manageAccount.html'
    })
    //启动路由
    avalon.history.start({
        // basepath : '/'
    });
    //go!!!!!!!!!
    avalon.scan();

})



