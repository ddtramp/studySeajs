/**
 * bootstrap.js - Initialize the plugins and load the entry module
 */

config({                                                                              //seajs加载后初始化configDada.plugins 属性
  // Get initial plugins
  plugins: (function() {
    var ret

    // Convert `seajs-xxx` to `seajs-xxx=1' seajs-xxx&seajs-xxxx  ===  seajs-xxx=1&seajs-xxxx=1
    // NOTE: use `seajs-xxx=1` flag in url or cookie to enable `plugin-xxx`
    var str = loc.search.replace(/(seajs-\w+)(&|$)/g, "$1=1$2")                      //如果本地location路径中有seajs-xxx&seajs-xxxx 转换为  seajs-xxx=1&seajs-xxxx=1

    // Add cookie string
    str += " " + doc.cookie                                                           //将document。cookie和str 连接

    // Exclude seajs-xxx=0
    str.replace(/seajs-(\w+)=1/g, function(m, name) {                               //提取出所需插件  replace()方法的特殊用法,使用下面方法测试一下就知道了
      (ret || (ret = [])).push(name)                                                  //var x="seajs-xxx=1&seajs-xxxx=1";var ret;x.replace(/seajs-(\w+)=1/g,function(m,name){(ret||(ret=[])).push(name)}) ;alert(ret);
    })

    return ret
  })()
})

var dataConfig = loaderScript.getAttribute("data-config")              //id=seajsnode  即加载seajs的标签  loaderScript = doc.getElementById("seajsnode")||scripts[scripts.length - 1]
var dataMain = loaderScript.getAttribute("data-main")

// Add data-config to preload modules
if (dataConfig) {                                                       //如果有dataConfig DOM对象 在configData.preload后面加上   dataConfig -----配置文件地址
  configData.preload.push(dataConfig)
}

if (dataMain) {                                                         //如果有dataMain DOM对象，加载dataMain所对应的js文件
  seajs.use(dataMain)
}

// Enable to load `sea.js` self asynchronously                           //允许seajs 异步加载自身   异步加载
if (_seajs && _seajs.args) {
  var methods = ["define", "config", "use"]
  var args = _seajs.args
  for (var g = 0; g < args.length; g += 2) {
    seajs[methods[args[g]]].apply(seajs, args[g + 1])
  }
}

/*
 ;(function(m, o, d, u, l, a, r) {
 if(m[o]) return
 function f(n) { return function() { r.push(n, arguments); return a } }
 m[o] = a = { args: (r = []), config: f(1), use: f(2) }
 m.define = f(0)
 u = d.createElement("script")
 u.id = o + "node"
 u.async = true
 u.src = "path/to/sea.js"
 l = d.getElementsByTagName("head")[0]
 l.appendChild(u)
 })(window, "seajs", document);
 */
