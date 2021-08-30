
var db = openDatabase('pic_spider_web', '1.0', 'I can spider pic !', 2 * 1024 * 1024);
var index = 0 ;//从最新一个开始读
var nums = 40 ;//一次读取40个，鼠标滚动到底部后会继续加载40个...
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
      searchwd:"",
      page:1,
      next_url_list:[],
    },
    created: function () {
        this.parse_param(location.search);
        this.clac_next_page();
        load_albumlist_from_websql(index,nums,this.searchwd);
        setTimeout("initial_position()",500);
        this.read_like();
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
        },
        mark_like: function(item){
            if(this.like_albumlist.some(x=>x.eleurl == item.eleurl)){
                item.like = true;
            }
        },
        parse_param: function(full_url){
            let url = decodeURI(full_url); // "./news.html?page=1&wd=xiuren";
            if(url.split("?").length == 1){ 
                return;
            }        
            let arr = url.split("?")[1].split("&");   //先通过？分解得到？后面的所需字符串，再将其通过&分解开存放在数组里
            let obj = {};
            for (let i of arr) {
                obj[i.split("=")[0]] = i.split("=")[1];  //对数组每项用=分解开，=前为对象属性名，=后为属性值
            }
            console.log(obj);
            index =  (obj.page-1)*nums;//page=1,0-40;=2,40~80
            this.searchwd = obj.wd;
            this.page = obj.page; 
        },
        clac_next_page: function () {
            let that = this;
            var start = that.page - 5;
            if(start < 1){
                start = 1;
            }
            var stop = parseInt(start) + 10;
            //console.log(start);
            //console.log(stop);
            var wdstr = that.searchwd?"&wd=" + that.searchwd:"";
            for (var i = start ; i < stop; i++) {
                var next_url = "./news.html?page=" + i + wdstr;
                //console.log(next_url);
                that.next_url_list.push(
                    {
                        "next_url":next_url,
                        "next_page":i,
                        //"label_id":that.now_label_id,
                    }
                );
            }
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

//以url中的host为key, 从localStorage中查找解析规则，并保存到内存vm
function find_parsenode(url) {
    var host = url.split('/')[0] + "//" + url.split('/')[2]; //根据url获取对应的结点,用于后面的解析规则
    var value = localStorage[host] || localStorage[host + '/'];
    if (value) {
        return JSON.parse(value);
    } else {
        console.log("根据url未找到"+ host +"的解析规则！");
    }
}

function load_albumlist_from_websql(index, nums, searchwd = null) {
    var rssidstr = searchwd?" where eletitle like '%" + searchwd + "%'":"";
    var sqlstr = `SELECT  eleurl,eletitle,elethumbnail,requrl,subtimestamp FROM albumlist ` + rssidstr +
                ` ORDER BY subtimestamp DESC LIMIT ?,? `;
    db.transaction(function (tx) {
        tx.executeSql(sqlstr, [index, nums], function (tx, results) {
                var len = results.rows.length;
                if (len) {
                    for (i = 0; i < len; i++) {
                        var hostnode = find_parsenode(results.rows.item(i).requrl);
                        //var hostnode = JSON.parse(localStorage.getItem(results.rows.item(i).requrl));
                        if(hostnode == null){
                            continue;
                        }
                        var item = {
                            "eletitle": results.rows.item(i).eletitle,
                            "eleurl": results.rows.item(i).eleurl,
                            "elethumbnail": results.rows.item(i).elethumbnail,
                            "requrl": results.rows.item(i).requrl,
                            "webname": hostnode.webname || "未找到主站" ,
                            "subtimestamp": results.rows.item(i).subtimestamp,
                            "like":false,
                        }
                        vm.mark_like(item);
                        vm.albumlist.push(item);
                    }              
                    if(len<nums){
                        console.log("已全部加载完毕!");
                        hasloadall = true;
                    }
                }
            },
            function (tx, error) {
                console.log('失败!', error.message)
            });
    });
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
        index += nums;
        // console.log(index,nums);
        load_albumlist_from_websql(index,nums,vm.searchwd);
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


