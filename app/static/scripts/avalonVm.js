
var vm = avalon.define({
    $id     :       'dailManage'
});

require(["mmState"], function() {
    avalon.state.config({
        onBeforeUnload: function (formstate, tostate) {
            
        },
        onError: function() {
            console.log(arguments)
        } // 强烈打开错误配置
    });
    avalon.router.error(function(a) {
        avalon.router.navigate("/lgoin");
    })

    avalon.state("index",{
        url :   '/login',
        //这里为index设置模板，index对应于login.html这个模板
        //login.html里面又为<div ui-view="footer"></div>指定了下一个模板
        //所以又配置了index里面的footer模板为footer.html
        views   :   {
            "": {
                templateUrl : "/tpl/login.html",
                controller : 'login'
            }/*,
            'footer@': { //footer部分
                templateUrl: '/tpl/footer.html'
            }*/
        }
    });
    //启动路由
    avalon.history.start({});
    //go!!!!!!!!!
    avalon.scan();
//    avalon.router.redirect('/index');

})



