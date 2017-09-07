'use strict';
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

require.config({
    paths: {
        "simplegrid": "../simplegrid/avalon.simplegrid"
    }
});
//require表格simplegrid
require(["simplegrid"], function () {
    function  getData(url) {
        var data = null;
        fetch('url',{
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
    avalon.define({
        $id : 'seeAlltype',
        simplegrid : {
            columns : [
                {field: "Sort_id", text: "ID", resizable: true, align: "center", width: "10%"},
                {field: "Sort_name", text: "类别名", resizable: true, align: "center", width: "10%"},
                {field: "Sort_id", text: "ID", resizable: true, align: "center", width: "10%"},
                {field: "Sort_id", text: "ID", resizable: true, align: "center", width: "10%"}
            ],
            showRows: 10,
            pageable: true,
            pager: {
                perPages: 20,
                totalItems: 1000,
                showPages: 5,
                options: [10, 20, 30, 40]
            },
            data : getData('/seeAlltype')
        }
    })
})