var vm = new Vue({
    el: '#app',
    data: {
        "hostnode": {},
        "elephtotolist": [],
        "elephtotolist_len": 0,
        "eledesc": {
            "url":"",
            "title": "",
            "pubdate": "",
            "company": "todo",
            "actor": "todo",
            "tags": [],
        },
        "start": 1,
        "concurrent_num": 6,//线程数，若有6个线程,则第一次分别访问1~6页，故第1个线程访问的是第1/7/13/6x+1/...页,设定获取到重复图片or出错时执行完毕，当前线程退出;
        "concurrent_ok_num": 0,
        "debug_switch": 1,
        "debug_info": ["正在打印debug信息..."],
        "calc_imgsrc_flag" : 0,
    },
    created: function () {
        //(this.concurrent_num = 1) && this.get_elephtotolist(location.search.slice(5)); //逐个请求,需要将并发数改为1,否则访问的是1,7,13...
        this.concurrent_get_elephtotolist(location.search.slice(5)); //并发请求,一次访问6个url
    },
    methods: {
        console_log: function (msg = "", msg2 = "") {
            let that = this;
            that.debug_switch && that.debug_info.push(msg + msg2) || console.log(msg, msg2);
        },

        //以url中的host为key, 从localStorage中查找解析规则，并保存到内存vm
        find_parsenode: function (url) {
            let that = this;
            var protocol = url.split('/')[0];
            var host = url.split('/')[2];
            var key = protocol + "//" + host; //根据url获取对应的结点,用于后面的解析规则
            //2021年8月13日 fix:增加key的兼容判断，支持4种key: xxx.com www.xxx.com xxx.com/ www.xxx.com/
            var key2 = protocol + "//www." + host;
            var key3 = protocol + "//" + host.slice(4);
            var value = localStorage[url] || localStorage[key] || localStorage[key + '/']   || localStorage[key2] || localStorage[key2 + '/'] || localStorage[key3] || localStorage[key3 + '/'] ;
            if (value) {
                that.hostnode = JSON.parse(value);
                that.console_log("根据url找到 "+ host +" 的解析规则！");
            } else {
                that.console_log("根据url未找到"+ host +"的解析规则！将使用localStorage中规则尝试解析！");
            }
        },
        calc_url: function (url, page) {
            let that = this;
            if (page == 1) {
                //that.console_log("首次请求的链接:  ", url);
                return url;
            }
            var s = that.hostnode.classname.split('->');//只有2、4有用
            var pos_s = s[1];
            var pos = url.lastIndexOf(pos_s);// 当pos_s为 . 时 取最后一个点的偏移
            var pos_str = s.pop().format(page);//?page={0} 改为 ?page=2 ; _{0} 改为 _2
            if (pos_s == "last") {
                //classname规则是这样的：locate->last->format->?page={0},则 https://xxx/15198.html 改为 https://xxx/15198.html?page=2
                return url + pos_str;
            } else if (pos_s.length == 1) {
                //classname规则是这样的：locate->.->1->format->_{0} ，则 https://xxx/15198.html 改为 https://xxx/15198_2.html
                return url.substr(0, pos) + pos_str + url.substr(pos);
            } else {
                return url.substr(0, pos) + pos_str + url.substr(pos + pos_s.length - 1);
            }
        },
        get_elephtotolist: async function (url, page = 1) {
            let that = this;
            var now_url = that.calc_url(url, page);
            //that.console_log("请求链接：",now_url);
            var repeat_flag = 0;

            await axios.get(now_url)
                .then(response => response.data)
                .then(function (html) {
                    var doc = new DOMParser().parseFromString(html, "text/html");

                    //显示标题，日期，机构，出镜，标签等信息
                    (vm.start == 1) && vm.get_eledesc(doc) && (vm.start = 0);

                    var alist = $(doc).find(that.hostnode.elephtotolist);
                    //that.console_log("请求链接：" + now_url, " , 解析到的phtoto数量=" + alist.length); //that.console_log(alist);
                    
                    alist.get().map(item => {
                        var itemstr = that.parse_item(item, that.hostnode.eleimgsrc); //$(item).attr('src');
                        itemstr = that.fixurl(itemstr);
                        //重复则停止继续获取(因为page超过实际值后也能获取到第一页的内容);
                        if(vm.elephtotolist.includes(itemstr)){
                            repeat_flag += 1;
                        }
                        else{
                            vm.elephtotolist.push(itemstr);
                            vm.elephtotolist_len += 1;
                        }
                        
                    });

                    //爬取到重复图片则标记当前线程执行完毕，不再循环调用；否则将图片加入列表，继续请求下一页(跳过线程数)
                    if(repeat_flag >= 2){
                        vm.concurrent_ok_num += 1;
                        that.console_log("请求链接发现重复图片，线程退出! 链接=" + now_url + " ,图片总数=" + alist.length, " ,重复数=" + repeat_flag);
                    }
                    else{
                        vm.get_elephtotolist(url, page + vm.concurrent_num);
                    }

                    //that.console_log("elephtotolist=",vm.elephtotolist);

                    //2021年9月1日:支持通过图片src计算后续图片的src（如 xxx/1.jpg -> xxx/2.jpg）,直接获取图片，而不是通常的获取网页再解析图片src
                    if(vm.hostnode.classname == "imgsrc->1->{0}"){
                        vm.calc_imgsrc_flag = 1;
                        vm.console_log("该网站通过第一张图片可以计算出后续图片地址！");
                        vm.calc_imgsrc();
                    }

                })
                .catch(e => {
                    vm.concurrent_ok_num += 1;
                    //if(!e.includes("404"))
                        that.console_log("请求链接发生异常:  " + now_url + "           ", e);
                });

        },

        concurrent_get_elephtotolist: async function (url, page = 1) {
            let that = this;
            //找解析规则前先从内存中判断是否存在
            var hostnode = JSON.parse(localStorage.getItem("now_hostnode"));
            if(hostnode){
                that.hostnode = hostnode;
                that.console_log("从localStorage中找到 "+ that.hostnode.homeurl +" 的解析规则！");
            }
            //找解析规则
            //从localStorage中查找解析规则,todo:优化,只找一次就ok
            await new Promise(function (resolve, reject) {
                resolve(that.find_parsenode(url))
            });

            var concurrent_list = [];
            for (var i = 0; i < 6; i++) {
                concurrent_list.push(await this.get_elephtotolist(url, page + i));//url 固定为当前文章首页 https://xxx/15198.html ，翻页均通过page参数修改
            }

            await axios.all(concurrent_list)
                .then(axios.spread((rs1, rs2, rs3, rs4, rs5, rs6) => {
                    // Both requests are now complete
                    that.console_log("6个执行完毕！", rs1); //that.console_log("6个执行完毕！",rs1,rs2,rs3,rs4,rs5,rs6);
                }));

            await that.console_log("全部执行完毕！");
        },

        //显示详情 ：标题，日期，机构，出镜，标签等信息
        get_eledesc: function (doc) {
            var dd = $(doc);
            vm.eledesc.url = location.search.slice(5) || "none" ;//dd.context.URL.slice(5) || "none" ;
            vm.eledesc.title = dd.context.title || "none";
            vm.eledesc.pubdate = dd.context.lastModified || "none";
            vm.eledesc.tags = dd.find('div.postmeta span a').text() || "none";
            vm.start = 0;
        },

        parse_item: function (item, parse_str) {
            let that = this;
            //that.console_log("parse_item:",parse_str);
            var findstr = parse_str.split('->')[0];
            var elephtotolist_last = that.hostnode.elephtotolist.split(' ').pop();
            if (parse_str.includes('attr')) {
                var laststr = parse_str.split('->').pop();
                if (findstr == elephtotolist_last) {
                    return $(item).attr(laststr);
                } else {
                    return $(item).find(findstr).attr(laststr);
                }
            } else {
                that.console_log("parse_item err", parse_str);
                return;
            }
        },
        onekey_download: function () {
            vm.elephtotolist.map(function (i) {
                downloadFile(i);
            });
        },
        fixurl: function (url) {
            let that = this;
            var tmp = url;
            if(url.startsWith("//")){
                tmp = "https:" + url
            }
            else if(url[0] == '/'){
                tmp = that.hostnode.albumurl + url;
            }
            else if(url[0] == '.'){
                tmp = that.hostnode.albumurl + url.substr(1);
            }
            return tmp;
        },
        calc_imgsrc: function () {
            var nowlen = vm.elephtotolist_len;
            var imgsrc = vm.elephtotolist[nowlen-1];
            var pos = imgsrc.lastIndexOf('/');
            var pos2 = imgsrc.lastIndexOf('.');
            
            for (var i = nowlen+1; i <= nowlen + 10; i++) {
                var nextimgsrc = imgsrc.substr(0, pos+1) + i + imgsrc.substr(pos2);
                vm.elephtotolist.push(nextimgsrc);
                vm.elephtotolist_len += 1;
            }
        }

    }
});

String.prototype.format = function () {
    if (arguments.length == 0) return this;
    for (var s = this, i = 0; i < arguments.length; i++)
        s = s.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
    return s;
}