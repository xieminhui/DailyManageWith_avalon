var connection = require('../db/connection');
var queryWithArgs = connection.queryWithArgs;
var query = connection.query;

/*
             输入           输出
insert       Book           信息
delete       Book.id        信息
modify       Book           信息
selectAll    无             [Book]     
selectOne    Book.id        Book
 */

//可以考虑将insert,delete,modify,selectOne,selectAll封装成方法
//将t_book等表格独立出来变成参数传入，然后将传入的对象也封装起来
//这样的话增删查改变成公共接口
var insert = function(objSpend, callback) {
    console.log("spend:" + objSpend);
    var sql = "insert into t_spend set ?";
    var obj = {
       // Book_name:      book.bookName   || '',
        purchaser:      objSpend.purchaser     || '',
        Sort_id:        objSpend.typeId     || 0, //连接类别的外键
        Price:          objSpend.price      || 0,
        purchaserPlace: objSpend.purchaserPlace || '',
        purchaserDate:       objSpend.purchaserDate    || new Date(),
      //  Total_num:      objSpend.sum        || 0,
        Current_num:    objSpend.currentNum || 0,
      //  Buy_date:       objSpend.buyDate    || new Date(),
        Brief:          objSpend.brief      || '',
        imageName:      objSpend.imageName  || ''
    };
    console.log(obj);
    try {
        //执行插入语句，成功返回success
        queryWithArgs(sql, obj, function(err, rows) {
            console.log("spendDaoInsertSuccess:" + rows);
            if (err) {
                console.error("spendDaoInsertError:" + err);
            }
            callback("success");
        });
    } catch (er) {
        //错误则输出异常并输出错误
        console.error("spendDaoInsertCatchError:" + er);
        callback(er);
    }
};

exports.insert = insert;

var deleteOne = function(id, callback) {
    var sql = "DELETE FROM t_spend WHERE id = ?";
    try {
        queryWithArgs(sql, id, function(err, rows) {
            console.log("spendDaoDeleteSuccess:" + rows);
            if (err) {
                console.error("spendDaoDeleteError:" + err);
            }
            callback("success");
        });
    } catch (er) {
        //错误则输出异常并输出错误
        console.error("spendDaoDeleteCatchError:" + er);
        callback(er);
    }
};

exports.deleteOne = deleteOne;


var modify = function(objSpend, callback) {
    var sql = "UPDATE t_spend SET ? WHERE id = " + objSpend.id;
    console.log("sql:"+sql);
    var obj = {
        purchaser:      objSpend.purchaser     || '',
        Sort_id:        objSpend.typeId     || 0, //连接类别的外键
        Price:          objSpend.price      || 0,
        purchaserPlace: objSpend.purchaserPlace || '',
        purchaserDate:       objSpend.purchaserDate    || new Date(),
        //  Total_num:      objSpend.sum        || 0,
        Current_num:    objSpend.currentNum || 0,
        //  Buy_date:       objSpend.buyDate    || new Date(),
        Brief:          objSpend.brief      || '',
        imageName:      objSpend.imageName  || ''
    };

    console.log(obj);
    console.log(sql);

    try {
        //执行插入语句，成功返回success
        queryWithArgs(sql, obj, function(err, rows) {
            console.log("spendModifySuccess:" + rows);
            if (err) {
                console.error("spendModifyError:" + err);
            }
            callback("success");
        });
    } catch (er) {
        //错误则输出异常并输出错误
        console.error("spendModifyCatchError:" + er);
        callback(er);
    }
};

exports.modify = modify;


var selectOne = function(id, callback){
    var sql = "SELECT * FROM t_book WHERE Book_num = ?";
    try {
        queryWithArgs(sql, id, function(err, rows) {
            console.log("BookDaoSelectOneSuccess:" + rows);
            if (err) {
                console.error("BookDaoSelectOneError:" + err);
            }
            callback(rows[0]);
        });
    } catch (er) {
        //错误则输出异常并输出错误
        console.error("BookDaoSelectOneCatchError:" + er);
        callback(er);
    }
};

exports.selectOne = selectOne;

var selectAll = function(callback) {
    var sql = "select * from t_spend,t_type where t_spend.Sort_id = t_type.Sort_id";
    try {
        //执行插入语句，成功返回success
        query(sql, function(err, rows) {
            console.log("spendDaoSelectAllSuccess:" + rows);
            if (err) {
                console.error("spendDaoSelectAllError:" + err);
            }
            callback(rows);
        });
    } catch (er) {
        //错误则输出异常并输出错误
        console.error("spendDaoSelectAllCatchError:" + er);
        callback(er);
    }
};

exports.selectAll = selectAll;

//选择echarts数据
var selectEchartsData = function (obj, callback) {
    var sql = "select t_spend.Sort_id,t_type.Sort_name,sum(t_spend.Price) as 'sum'" +
        " from t_type inner  join t_spend " +
        "  on  t_type.Sort_id = t_spend.Sort_id" +
        " and t_spend.purchaser = '"+obj.user+"'and purchaserDate between '"+obj.beginTime+"' and'" +obj.endTime+"'" +
        " group BY t_spend.Sort_id";
    try {
        //执行插入语句，成功返回success
        query(sql, function(err, rows) {
            console.log("EchartsDataSelectAllSuccess:" + rows);
            if (err) {
                console.error("EchartsDataSelectAllError:" + err);

            }
            callback('sucess',rows);
        });
    } catch (er) {
        //错误则输出异常并输出错误
        console.error("EchartsDataSelectAllCatchError:" + er);
        callback('error');
    }
};

exports.selectEchartsData = selectEchartsData;