var config = require('./config.js'),
    SpendTypeDao = require('../dao/SpendTypeDao.js'),
    SpendDao = require('../dao/SpendDao.js'),
    UserDao = require("../dao/UserDao.js"),
    md5 = require('md5');


exports.addType = function(req, res) {
    //封装obj
    var obj = {
        typeName: req.body.typeName
    };
    console.log("需要添加到数据库的类别名为：" + req.body.typeName);

    // 调用DAO层接口
    SpendTypeDao.insert(obj, function() {
        console.warn("添加类别成功");
        //返回给客户端200成功插入反馈
        res.status(200).json({
            success: '添加类别成功'
        });
    });
};

//查看全部类别
exports.seeAllType = function(req, res) {
    SpendTypeDao.selectAll(function(rows) {
        res.status(200).json(rows);
    });
};

//修改类别
exports.updateType = function(req, res) {
    var obj = req.body;
    SpendTypeDao.modify(obj, function() {
        res.status(200).json({
            success: '修改类别成功'
        });
        console.log("修改类别成功");
    });
};

//删除类别
exports.deleteType = function(req, res) {
    //接受url传递的删除类别的id值
    var id = req.params.id;
    SpendTypeDao.deleteOne(id, function() {
        res.status(200).json({
            success: '删除类别成功'
        });;
        console.log("删除类别成功");
    });
};

//添加消费支出
exports.addSpending = function(req, res) {
    //封装obj
    var obj = {
       // bookName: req.body.bookName,
        purchaser: req.body.purchaser,
        typeId: req.body.typeId, //连接类别的外键
        price: req.body.price,
        purchaserPlace: req.body.purchaserPlace,
        purchaserDate: req.body.purchaserDate,
       // sum: req.body.sum,
        currentNum: req.body.currentNum,
        // buyDate:         '2007-06-01',
        brief: req.body.brief,
        imageName: ''
    };
    // console.log(obj);
    // 调用DAO层接口
    SpendDao.insert(obj, function() {
        console.warn("添加成功");
        //返回给客户端200成功插入反馈
        res.status(200).json({
            success: '添加成功'
        });
    });
};

//查看全部消费
exports.seeAllSpend = function(req, res) {
    SpendDao.selectAll(function(rows) {
        res.status(200).json(rows);
    });
};

//修改消费类别
exports.updateSpend = function(req, res) {
    var obj = req.body;
    console.log(obj);
    SpendDao.modify(obj, function() {
        res.status(200).json({
            success: '修改消费成功'
        });
        console.log("修改消费成功");
    });
};

//删除消费
exports.deleteSpend = function(req, res) {
    //接受url传递的删除类别的id值
    var id = req.params.id;
    SpendDao.deleteOne(id, function() {
        res.status(200).json({
            success: '删除消费成功'
        });;
        console.log("删除消费成功");
    });
};

//添加管理员
exports.addAdmin = function(req, res) {
    //封装obj
    var obj = {
        username: req.body.username,
        password: req.body.password
    };
    // 调用DAO层接口
    UserDao.insert(obj, function(msg, err) {
        if (err) {
            if (err.errno == 1062)
                res.status(403).json({
                    success: '已有这个账户'
                });
            return;
        }
        console.warn("添加管理员成功");
        //返回给客户端200成功插入反馈
        res.status(200).json({
            success: '添加管理员成功'
        });
    });
};

//管理账号
exports.manageAccount = function(req, res) {
    var obj = {
        username: req.body.username,
        password: md5(req.body.password),
        oldPassword: md5(req.body.pswOld)
    };

    UserDao.selectAll(function(rows) {
        //缓存变量，提高查找效率
        var i, len;
        //获得后台的用户列表数据
        // var userList = JSON.parse(JSON.stringify(rows));
        for (i = 0, len = rows.length; i < len; i++) {

            console.log("需要数据库匹配的账号为：" + obj.username);
            console.log("需要数据库匹配的密码为：" + obj.oldPassword);

            if (rows[i].Admin_name === obj.username && rows[i].Admin_password === obj.oldPassword) {
                obj.id = rows[i].Admin_id; //添加id
                console.log(rows[i]);
                console.log(obj);
                break;
            }
        }

        if (i < len) {
            //找到了用户
            console.log("找到了用户");
            //修改密码
            UserDao.modify(obj, function(msg, err) {
                if (err) {
                    res.status(200).json({
                        ret : 1000,
                        success: '修改失败'
                    });
                }
                res.status(200).json({
                    success: '修改成功'

                });
            });

        } else {
            res.status(403).json({
                success: '用户名或密码不正确'
            });
        }
    });
};

//查找表格数据
exports.getEchartData = function (req, res) {
    var obj = {
        user : req.session.Admin_name,
        beginTime : req.body.startTime,
        endTime   : req.body.endTime
    };
    SpendDao.selectEchartsData(obj, function (msg,row) {
        if (msg == 'error') {
            res.json({
                success: '获取数据失败!',

            });
        }
        var data = {
            "xAxis"  : [],
            "series" : []
        };
      //  var a = new Array;
      //  var b = new Array;
        for(var i=0;i<row.length;i++){
         //   a[i] = row[i].Sort_name;
        //    b[i] = row[i].sum;
            data.xAxis[i] = row[i].Sort_name;
            data.series[i] = row[i].sum;
        }
        res.status(200).json({
            row    : data,
            success: '获取数据成功!'
        });
    });
}
