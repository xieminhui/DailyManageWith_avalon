//requirejs bulid
({
    basepath: 'static/scripts',
    paths : {
        'jquery' : '../../lib/jquery-1.9.1',
        'bootstrap' : "../../lib/bootstrap-3.3.6/js/bootstrap",
        'avalon' : '../../lib/avalon.oniui-master/avalon',
        'mmHistory' : '../../lib/avalon.oniui-master/mmRouter/mmHistory',
        'mmPromise' : '../../lib/avalon.oniui-master/mmRouter/mmPromise',
        'mmRouter' : '../../lib/avalon.oniui-master/mmRouter/mmRouter',
        'mmstate' : '../../lib/avalon.oniui-master/mmRouter/mmState'
    },
    name : 'login',
    optimize: 'none',//是否压缩 默认是压缩的，去掉不要就是压缩
    out : 'index.js'
})