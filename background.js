//初始化读取
var hostlist = [];
for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if(key.includes('.')){
        var value = JSON.parse(localStorage.getItem(key));
        //读取指定的kv
        if (value.albumurl && value.albumurl == key) {
            hostlist.push(value);
        }
    }
}
console.log("主站数量 = ", hostlist.length);

//新建表
var db = openDatabase('pic_spider_web', '1.0', 'I can spider pic !', 2 * 1024 * 1024);
db.transaction(function (tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS albumlist (eleurl unique,eletitle,elethumbnail,requrl,subtimestamp)');
});


//5.储存items到websql
async function items2websql(items) {
    db.transaction(function (tx) {
        var num = 0;
        for (i = 0; i < items.length; i++) {
            //INSERT OR IGNORE REPLACE
            tx.executeSql('INSERT OR IGNORE INTO albumlist (eleurl,eletitle,elethumbnail,requrl,subtimestamp) VALUES (?,?,?,?,?)', items[i],
                function(tx,result){ 
                    num += result.rowsAffected;
                    if(i == items.length -1){
                        console.log('[%s]获取新图集数量=%s', items[0][3], num);
                    }
                },
                function (tx, error) {
                    console.log('[%s]添加数据失败: %s', items[0][3], error.message)
                });
        }
    });
}


//4.解析DOM
function parse_item(item, parse_str) {
    //console_log("parse_str:",parse_str);
    var rst = 0;
    var findstr = parse_str.split('->')[0];
    if (parse_str.includes('attr')) {
        var laststr = parse_str.split('->').pop();
        //2021年8月13日 fixbug: item.find('a').attr('href'),若最外层为a则找不到，改为 item.attr('href')
        rst =  $(item).find(findstr).attr(laststr) || $(item).attr(laststr); 
    } else if (parse_str.includes('text')) {
        rst =  $(item).find(findstr).text();
    } else {
        console.log("解析规则未实现!", parse_str);//发生该错误时，说明有新规则不兼容，需要增加
    }

    if(!rst){
        //console.log("解析某一项失败，DOM可能异常! 请打开console查看打印详情！", parse_str);
    }

    return rst;
}
function fixurl (url,hostnode) {
    let that = this;
    var tmp = url;
    url  && (url[0] == '/') && (tmp = hostnode.albumurl + url);
    url  && (url[0] == '.') && (tmp = hostnode.albumurl + url.substr(1));
    return tmp;
}


//3.请求图集列表
async function request_albumlist(hostnode,url) {
    await axios.get(url, { //todo:改为标签url列表
            params: {
                charset: hostnode.charset
            }
        })
        .then(response => response.data)
        .then(async function (html) {
            console.log("[%s]开始解析dom...",url);
            var doc = new DOMParser().parseFromString(html, "text/html");
        
            var elearticle = await $(doc).find(hostnode.elearticle);
            //console.log("[%s]当前页面的图集数量 = %s", url, elearticle.length);
        
            var albumlist = [];
            await elearticle.get().map(item => albumlist.push([
                fixurl(parse_item(item, hostnode.eleurl), hostnode),        //eleurl
                parse_item(item, hostnode.eletitle),                        //eletitle
                fixurl(parse_item(item, hostnode.elethumbnail), hostnode),  //elethumbnail
                url,                                          //requrl
                Math.round(new Date().getTime() / 1000),
            ]));
            
            if(albumlist.length >= 1){
                await items2websql(albumlist);
            }
            //console.log("[%s]执行成功!",url);
        })
        .catch(e => console.log("[%s]执行失败! err = %s",url, e));
}

//将标签拆分
function split_label(hostnode) {
    var label_format_url = [];
    var label_list = hostnode.label.split(';');
    var labelid_list = hostnode.labelid.split(';');
    var label_counts = label_list.length - 1;
    for(var i = 0; i < label_counts; i++){
        var url = hostnode.homeurl.replace('{1}',labelid_list[i]).replace('{0}',hostnode.homepager);
        label_format_url.push(
            {
                "label":label_list[i],
                "label_url":url,
                "label_id":labelid_list[i],
            }
        );
    }
    return label_format_url;
}

//2.高并发请求
async function concurrent_request() {
    //记录上次执行的时间
    localStorage.laststamp = Math.round(new Date().getTime() / 1000);

    var concurrent_list = [];
    //每个host一个并发数，该线程执行该host下的所有标签url的请求;（好处：一个host同时只有一个线程访问，不会轻易被网站限制）
    for (var i = 0; i < hostlist.length; i++) {
        //检测网站主页更新
        concurrent_list.push(await request_albumlist(hostlist[i],hostlist[i].albumurl));
        //检测各标签首页更新
        /*var label_url_list = split_label(hostlist[i]);
        for (var j = 0; j < label_url_list.length; j++) {
            concurrent_list.push(await request_albumlist(hostlist[i],label_url_list[j].label_url));
        }*/

    }

    await axios.all(concurrent_list)
        .then(axios.spread((rs1) => {
            console.log("全部执行完毕！", rs1); //console.log("6个执行完毕！",rs1,rs2,rs3,rs4,rs5,rs6);
        }));

    console.log("全部执行完毕！");
}

//1.定时(X min)请求rss源，更新websql
var reqtime = Number(localStorage.reqtime ? localStorage.reqtime : 60);
reqtime *= 60000;
setInterval("concurrent_request()", reqtime); //60min周期执行

//打开网页时执行一次，此后按周期执行
var laststamp = localStorage.laststamp ? localStorage.laststamp : 0 ;
var nowstamp = Date.parse(new Date())/1000;//单位秒
var xt = Math.round((nowstamp - laststamp)/60) ;//相差分钟数
if(xt > 60){
    console.log("距离上次请求超过60分钟，即将执行请求！");
    concurrent_request();
}