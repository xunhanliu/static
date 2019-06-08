/**
 * Created by Administrator on 2018/4/11 0011.
 */

    toastr.options.positionClass = 'toast-top-center';
    toastr.options.extendedTimeOut = 0; //1000;  调试css使用
    toastr.options.timeOut = '2000';//延时时间

    toastr.options.fadeOut = 250;
    toastr.options.fadeIn = 250;
    toastr.options.closeButton = true;
    toastr.options.progressBar= true;
    function showToast(type,msg,title,pos) {
        //info 参数： success  info  warning error
        //pos  参数： toast-bottom-left   toast-bottom-right  toast-bottom-center   toast-bottom-full-width
        //            toast-top-left   ......
        //msg 可以内部是html-text
        var title = arguments[2] ? arguments[2] : "";
        var pos = arguments[3] ? arguments[3] : "toast-top-center";
        toastr.options.positionClass =pos;
        toastr[type](msg,title);

    }
    // $('#tryMe').click(function () {
        // showToast('info','sss');
        // showToast('error','sssdd!!','toast-bottom-left','toast-bottom-left');
    // });
