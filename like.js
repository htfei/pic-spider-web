
var nowstamp = Date.parse(new Date())/1000;//单位秒
var searchwd = null;
var hasloadall = false;

var itemsval = [];
var vm = new Vue({
    el: '#app',
    data: {
      message: 'Hello Vue.js!',
      albumlist: [],
      like_albumlist: [],
      searchwd:null,
    },
    created: function () {
        this.read_like();
        setTimeout("initial_position()",500);
    },
    methods:{
        like_it: function(item){
            item.like = !item.like;
            if(item.like){
                this.like_albumlist.push(item);
            }
            else{
                this.like_albumlist = this.like_albumlist.filter(x=> x.requrl != item.requrl);
            }
            //保存到localstorage
            var val = JSON.stringify(this.like_albumlist);
            localStorage.setItem("like_item",val);

        },
        read_like: function(){
            this.like_albumlist = JSON.parse(localStorage.getItem("like_item")) || [];
            this.albumlist = this.like_albumlist;
        }
    }
});



//将时间显示优化
function beautimey(ptmstamp){
    var xt = Math.round((nowstamp - ptmstamp)/60) ;//相差分钟数
    if(xt < 60)
        return xt + "分钟前"
    else if(xt/60 < 24)
        return Math.round(xt/60) + "小时前"
    else if(xt/60/24 < 2)
        return "昨天"
    else if(xt/60/24 < 3)
        return "前天"
    else if(xt/60/24 < 7){
        return Math.round(xt/60/24) + "天前";
    }
    else{
        var myDate = new Date(ptmstamp*1000);
        if (myDate.getFullYear() != new Date().getFullYear() )
            return myDate.getFullYear() + "年" + (myDate.getMonth()+1) + "月" + myDate.getDate() + "日";
        return (myDate.getMonth()+1) + "月" + myDate.getDate() + "日";
    }
}


//此处是滚动条到底部时候触发的事件，在这里写要加载的数据，或者是拉动滚动条的操作
//BUG：滚三次没效果了?各种奇怪问题。//DEBUG:==改为>=,MD滚远了
$(window).scroll(function () {
    if(hasloadall){
        console.log("已全部加载完毕!不再执行滚动加载！");
        return ;
    }
    var scrollTop = $(this).scrollTop();
    var scrollHeight = $(document).height();
    var windowHeight = $(this).height();
    // console.log(scrollTop,windowHeight,scrollHeight);
    if (windowHeight - scrollTop  < 1000) {
        //index += nums;
        // console.log(index,nums);
        //load_albumlist_from_websql(index,nums,vm.searchwd);
        setTimeout("initial_position()",500);
    }
});


var unit_wid = 400;//单元格子宽度
var unit_edge = 30;//单元格子间隔
var unit_rate = 0.90;



function initial_position(){
    var wd = $(window).width();
    var wf_wid = wd*unit_rate;//可用于计算页面总宽度
    var num = Math.floor(wf_wid / unit_wid);//每行格子个数
    var wf_edge = (wd - (unit_wid * num + unit_edge * (num - 1))) / 2;//两侧剩余宽度
    var heightList = [];
    for (var i = 0;i< num ;i++) {
        heightList[i] = 0;
    }
    for (var j = 0;j < $('#wf .unit').length;j++) {
        var col_minHeight = getMin(heightList).min;
        var col_minIndex = getMin(heightList).index;//找出最小高度的格子行及其高度
        var new_top = col_minHeight;
        var new_left = col_minIndex * (unit_wid + unit_edge) + wf_edge ;//计算左边距
        var unit = $('#wf .unit');
        unit.eq(j).stop().animate({'top': new_top + 'px','left': new_left + 'px'},1000);
        heightList[col_minIndex] = col_minHeight + unit.eq(j).height() + unit_edge;
    }
    set_wfHeight(getMax(heightList));
}

$(window).resize(function(){
    initial_position();
});

function set_wfHeight (max) {
    var wf_height = max + 50;
    $('#wf').css('height',wf_height + 'px');
}

function getMax (arr) {
    var max = arr[0];
    for (var i=1;i<arr.length;i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

function getMin(arr){
    var min = arr[0];
    var index = 0;
    for(var i=1;i<arr.length;i++){
        if (arr[i] < min) {
            min = arr[i];
            index = i;
        }
    }
    return {min:min,index:index};
}


