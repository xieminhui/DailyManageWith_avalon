//后台管理界面打包配置文件
({
    baseUrl: "app/", //找到main.js文件的目录
    paths: {
        avalon: "./avalon.shim",
        text: "./combo/text", //由于分居两个目录，因此路径都需要处理一下
        css: "./combo/css",
        "css-builder": "./combo/css-builder",
        "normalize": "./combo/normalize",
        domReady: "./combo/domReady",
        "echarts" : "../../lib/echarts",
        "html5shiv" : "../html5shiv.min.js",
        "respond" : "respond.min.js"
    },
    name : 'admin',
    optimize: 'none',//是否压缩 默认是压缩的，去掉不要就是压缩
    out : './adminbuild.js'
})