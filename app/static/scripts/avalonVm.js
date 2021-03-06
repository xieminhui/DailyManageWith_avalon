
require(["mmstate"], function() {
    avalon.define({       //这个一定要写再里面
        $id     :       'dailManage'
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
        avalon.router.go('index');//其他路由选项，直接跳到定义的index路由状态
    })
    avalon.state("index",{
        url :   "/index",
       // controller : 'Loginctrl',
        //这里为index设置模板，index对应于login.html这个模板
        //login.html里面又为<div ui-view="footer"></div>指定了下一个模板
        //所以又配置了index里面的footer模板为footer.html
        views   :   {
            "": {
                templateUrl : "/tpl/login.html"
            },
            'footer@index': { //footer部分
                templateUrl: '/tpl/footer.html'
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



