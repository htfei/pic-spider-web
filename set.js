var vm = new Vue({
  el: '#app',
  data: {
    "hostnode": {},
    "debug_info": "",
  },
  created: function () {
    this.find(location.search.slice(5));
  },
  methods: {
    find: function (url) {
      let that = this;
      var host = url.split('/')[0] + "//" + url.split('/')[2];
      var value = localStorage[url] || localStorage[host] || localStorage[host + '/'];
      if (value) {
        that.hostnode = JSON.parse(value);
        console.log("find ok!");
      } else {
        console.log("find err!");
      }
    },

    save: function () {
      if(this.hostnode.albumurl){
        localStorage.setItem(this.hostnode.albumurl, JSON.stringify(this.hostnode));
        this.debug_info = "保存成功！"
      }
      else{
        this.debug_info = "保存失败！"
      }
    },
    del: function () {
      localStorage.removeItem(this.hostnode.albumurl);
      this.debug_info = "删除成功！"
    },
  }
});
