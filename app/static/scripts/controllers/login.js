'user strict';

avalon.define({
    $id  : 'LoginCtrl',
    Username : '',
    Password : '',
    postLoginData : function (event) {
        //var form =  document.getElementById("myForm");
        var form =event.target;
        form.action = '/loginData';
        form.method = 'POST';
        form.submit();
    },
    validate : {
        validateAllInSubmit: false,
        onError : function (reasons) {
            reasons.forEach(function (reason) {
                console.log(reason.getMessage());
            })
        },
        onValidateAll : function (reasons) {
            // if(reasons.length){
            //     //这里写表单没有通过操作
            // } else {
            //     var form = this;
            //     form.action = '/loginData';
            //     form.method = 'POST';
            //     form.submit();
            // }
        }
    }
})
