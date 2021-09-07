var default_hostnode = {
    "id": "355",
    "homeurl": "https://www.tuaoo.xyz/{1}_{0}.html",
    "homepager": "1",
    "albumurl": "https://www.tuaoo.xyz/",
    "charset": "utf-8",
    "label": "无圣光;凸凹图;人体艺术;精品套图;欧美女郎;",
    "labelid": "category-1;category-2;category-3;category-5;category-6;",
    "webname": "🙂🈲🔎凸凹吧",
    "elearticle": "main[class='main'] article",
    "eletitle": "h2->text",
    "eleurl": "a->attr->href",
    "elethumbnail": "img->attr->src",
    "elephtotolist": "div[class='entry'] img",
    "eleimgsrc": "img->attr->src",
    "classname": "locate->last->format->?page={0}",
    "searchurl": "https://www.tuaoo.xyz/search.php?q={1}&amp;page={0}"
}


var vm = new Vue({
    el: '#app',
    data: {
        //"hostlist":hostlist,
        "hostnode": {},
        "albumlist": [],

        //debug相关
        "debug_switch": 1,
        "debug_info": ["正在打印debug信息..."],
        "item":"",//用于解析图集列表的某个item出错时，打印显示
        "parse_index":0,//标记第几次调用parse_item函数，若为1/2/3次说明在解析第一个item，以此类推可知第几个item出错
        
        //查询相关
        "queryurl_with_no_param":"",
        "querywd":"",
        "querypage":"",

        //标签相关
        "label_format_url":[],

        //下一页相关
        "now_label_id":"",
        "now_page":1,
        "next_url_list":[],
    },
    created: function () {
        var url = location.search.slice(5) || default_hostnode.albumurl;
        
        //设置查询按钮
        this.queryurl_with_no_param = url.split('?')[0];
        this.querywd = "";
        this.querypage = "1";

        //获取图集列表
        this.get_albumlist(url);
    },
    methods: {
        console_log: function (msg = "", msg2 = "") {
            let that = this;
            that.debug_switch && that.debug_info.push(msg + msg2) || console.log(msg, msg2);
        },

        //点击标签、分页按钮时记录当前分类和页数，便于后续执行“下一页”操作
        save_for_next_page: function (label_id,page) {
            localStorage.setItem("now_label_id", label_id);
            localStorage.setItem("now_page", page);
            console.log(label_id,page);

            //保存hostnode，下次不用在查询了
            let that = this;
            localStorage.setItem("now_hostnode", JSON.stringify(that.hostnode));
        },
        //设置下一页按钮
        clac_next_page: function () {
            let that = this;

            that.now_label_id = localStorage.getItem("now_label_id") || that.label_format_url[0].label_id;
            that.now_page = localStorage.getItem("now_page") || that.hostnode.homepager;
            //console.log(that.now_label_id);
            //console.log(that.now_page);
           var start = that.now_page - 5;
            if(start < parseInt(that.hostnode.homepager)){
                start = parseInt(that.hostnode.homepager);
            }
            var stop = parseInt(start) + 10;
            //console.log(start);
            //console.log(stop);
            for (var i = start ; i < stop; i++) {
                var next_url = that.hostnode.homeurl.replace('{1}',that.now_label_id).replace('{0}',i);
                //console.log(next_url);
                that.next_url_list.push(
                    {
                        "next_url":next_url,
                        "next_page":i,
                        //"label_id":that.now_label_id,
                    }
                );
            }
            
            //用完之后就清空，避免同时打开多个网站时，其他的受到影响
            localStorage.removeItem("now_label_id");
            localStorage.removeItem("now_page");
            localStorage.removeItem("now_hostnode");
        },

        //将标签拆分
        split_label: function (url) {
            let that = this;
            var label_list = that.hostnode.label.split(';');
            var labelid_list = that.hostnode.labelid.split(';');
            var label_counts = label_list.length - 1;
            for(var i = 0; i < label_counts; i++){
                var url = that.hostnode.homeurl.replace('{1}',labelid_list[i]).replace('{0}',that.hostnode.homepager);
                that.label_format_url.push(
                    {
                        "label":label_list[i],
                        "label_url":url,
                        "label_id":labelid_list[i],
                    }
                );
            }
        },

        //以url中的host为key, 从localStorage中查找解析规则，并保存到内存vm
        find_parsenode: function (url) {
            let that = this;
            var host = url.split('/')[0] + "//" + url.split('/')[2]; //根据url获取对应的结点,用于后面的解析规则
            var value = localStorage[url] || localStorage[host] || localStorage[host + '/'];
            if (value) {
                that.hostnode = JSON.parse(value);
                that.console_log("根据url找到 "+ host +" 的解析规则！");
                //将标签拆分
                that.split_label();
                //设置下一页按钮
                that.clac_next_page();
            } else {
                that.console_log("根据url未找到"+ host +"的解析规则！");
            }
        },

        get_albumlist: async function (url) {
            let that = this;
            that.console_log("将要访问的链接:", url);

            //找解析规则
            await new Promise(function (resolve, reject) {
                resolve(that.find_parsenode(url))
            });
            //that.console_log("find hostnode ok!",that.hostnode);

            that.console_log("开始请求链接...");
            await axios.get(url, {
                    params: {
                        charset: that.hostnode.charset
                    }
                })
                .then(response => response.data)
                .then(async function (html) {
                    that.console_log("开始解析dom...");
                    var doc = new DOMParser().parseFromString(html, "text/html");

                    var elearticle = $(doc).find(that.hostnode.elearticle);
                    that.console_log("当前页面的图集数量 = ", elearticle.length); //that.console_log(elearticle);

                    elearticle.get().map(item => that.albumlist.push({
                        "eletitle": that.parse_item(item, that.hostnode.eletitle),
                        "eleurl": that.fixurl(that.parse_item(item, that.hostnode.eleurl)),
                        "elethumbnail": that.fixurl(that.parse_item(item, that.hostnode.elethumbnail)),
                        "elelike": false,
                    }));
                    that.console_log("执行成功!");
                })
                .catch(e => that.console_log("执行失败!", e));

            //that.console_log("init over?");
        },

        parse_item: function (item, parse_str) {
            let that = this;
            that.parse_index += 1;//用于调试
            //that.console_log("parse_str:",parse_str);
            var rst = 0;
            var findstr = parse_str.split('->')[0];
            if (parse_str.includes('attr')) {
                var laststr = parse_str.split('->').pop();
                //2021年8月13日 fixbug: item.find('a').attr('href'),若最外层为a则找不到，改为 item.attr('href')
                rst =  $(item).find(findstr).attr(laststr) || $(item).attr(laststr); 
            } else if (parse_str.includes('text')) {
                rst =  $(item).find(findstr).text();
            } else {
                that.console_log("解析规则未实现!", parse_str);//发生该错误时，说明有新规则不兼容，需要增加
            }

            if(!rst){
                that.console_log("解析某一项失败，DOM可能异常! 请打开console查看打印详情！", parse_str);
                that.item = $(item);//用于调试
                console.log("出错的项: ", parseInt(that.parse_index/3 +0.7) );
                console.log("出错的dom: ",item);
                console.log("出错的$(dom) = vm.item: ",that.item);
                console.log("出错的parse_str: ",parse_str);
            }

            return rst;
        },
        fixurl: function (url) {
            let that = this;
            var tmp = url;
            url  && (url[0] == '/') && (tmp = that.hostnode.albumurl + url);
            url  && (url[0] == '.') && (tmp = that.hostnode.albumurl + url.substr(1));
            return tmp;
        },
        like: function(item,index){
            if(vm.hostnode.like){
                vm.hostnode.like.push(item.eleurl);
            }
            else{
                vm.hostnode.like=[item.eleurl];
            }
        }
    }
});