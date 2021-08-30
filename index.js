var vm = new Vue({
    el: '#app',
    data: {
        "hostlist": [],
        "hostlist_num": 0,
    },
    created: function () {
        this.load_from_LocalStorage();
    },
    methods: {
        load_from_LocalStorage: function () {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                var val =localStorage.getItem(key) ;
                try{
                    value = JSON.parse(val);
                    //读取指定的kv
                    if(value.albumurl && value.albumurl == key)
                    {
                        this.hostlist.push(value);
                        this.hostlist_num += 1;
                    } 
                }
                catch(e){
                    //console.log("%s 不是相关的key!err=%s",val,e);
                }
            }
        },

        del: function (item,index) {
            this.hostlist.splice(index, 1);
            localStorage.removeItem(item.albumurl);
        },
        delall: function () {
            this.hostlist.splice(0, vm.hostlist_num);
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if(key != 'laststamp' && key != 'like_item')
                {
                    localStorage.removeItem(key);
                }else{
                    //console.log(key);
                }
            }
        },

        export_file: function () {
            var name = "web4.json";
            var data = JSON.stringify(this.hostlist);
            export_raw(name, data);
        },

    }
});

//导入表单文件到localStorage，并刷新页面
document.getElementById('loadfile').onchange = function jsReadFiles() {
	if (this.files.length) {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onload = function() {
				var json = JSON.parse(this.result);
				console.log(json);
				for(var i = 0 ;i < json.length; i++ ){
					var key = json[i].albumurl;
					var value = JSON.stringify(json[i]);
					localStorage.setItem(key,value);
				}
				location.reload();
		};
		reader.readAsText(file);
	}
};
/*//err
//导入表单文件到localStorage，并刷新页面
function jsReadFiles (that) {
    console.log(that);
    console.log(that == vm);
    console.log(that.files);
    console.log(that.files.length);
    if (that.files.length) {
        var file = that.files[0];
        var reader = new FileReader();
        reader.onload = function () {
            var json = JSON.parse(this.result);
            console.log(json);
            for (var i = 0; i < json.length; i++) {
                localStorage.setItem(json[i].albumurl, JSON.stringify(json[i]));
            }
            location.reload();
        };
        reader.readAsText(file);
    }
}*///

// 导出localStorage到文件
function fake_click(obj) {
    var ev = document.createEvent("MouseEvents");
    ev.initMouseEvent(
        "click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null
    );
    obj.dispatchEvent(ev);
}

function export_raw(name, data) {
    var urlObject = window.URL || window.webkitURL || window;
    var export_blob = new Blob([data]);
    var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
    save_link.href = urlObject.createObjectURL(export_blob);
    save_link.download = name;
    fake_click(save_link);
}