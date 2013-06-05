/**
 * module.js - The core of module loader
 */

var cachedModules = seajs.cache = {}
var anonymousModuleData                                        //对没有使用define（）定义的module而使用的临时变量

var fetchingList = {}
var fetchedList = {}
var callbackList = {}
var waitingsList = {}

// 1 - The module file is being fetched now
// 2 - The module data has been saved to cachedModules
// 3 - The module and all its dependencies are ready to execute
// 4 - The module is being executed
// 5 - The module is executed and `module.exports` is available
var STATUS_FETCHING = 1
var STATUS_SAVED = 2
var STATUS_LOADED = 3
var STATUS_EXECUTING = 4
var STATUS_EXECUTED = 5


function Module(uri) {                                      //定义一个构造函数，用于初始化一个新的Module
  this.uri = uri
  this.dependencies = []
  this.exports = null
  this.status = 0
}

function resolve(ids, refUri) {                              //参数ids 一定要是维数组 ，如果是多维数组，会不断的替换掉ret[0],ret[1]......refuri可选参数r
  if (isArray(ids)) {                                         //检查ids是否是数组，如果是，继续执行
    var ret = []
    for (var i = 0; i < ids.length; i++) {
      ret[i] = resolve(ids[i], refUri)
    }
    return ret
  }

  // Emit `resolve` event for plugins such as plugin-text      //如果不是数组，则定义变量data
  var data = { id: ids, refUri: refUri }
  emit("resolve", data)                                        //将参数data传给resolve自定义事件callback函数并执行   如果没有resolve，则什么都不做

  return data.uri || id2Uri(data.id, refUri)                  //emit("resolve", data) 可以设置data.uri  返回路径
}

function use(uris, callback) {
  isArray(uris) || (uris = [uris])                              //如果uis维数组，直接使用uris，否则uris为数字或字符串，则将转为数组赋值给uris
                                                                //调用此方法的时候uris里面的路径已经被解析成完整的路径了
  load(uris, function() {
    var exports = []

    for (var i = 0; i < uris.length; i++) {
      exports[i] = getExports(cachedModules[uris[i]])         //获取所有已加载模块的接口存到数组中
    }

    if (callback) {
      callback.apply(global, exports)                         //gloobal 全局对象指向windows 将exports传给callback
    }                                                         //作用域 windows全局
  })
}

function load(uris, callback) {
  var unloadedUris = getUnloadedUris(uris)                 //通过getUnloadedUris()将uris中没有加载的模块uri保存到unloadedUris，如果没有被加载，则会通过cachedModules[uri] = new Module(uri)保存一份初始化的module到cachedModules对象中

  if (unloadedUris.length === 0) {                         //如果uris中所有路径中的模块都已经加载了，则执行回调函数，
    callback()                                             // 并且直接返回
    return
  }

  // Emit `load` event for plugins such as plugin-combo
  emit("load", unloadedUris)                                //将 unloadedUris传给自定义load事件的callbak函数执行  如果没有load事件则什么都不做

  var len = unloadedUris.length                            //获取未加载module的数目
  var remain = len

  for (var i = 0; i < len; i++) {
    (function(uri) {                                       //自执行函数，uri为unloadedUris[i]的值
      var mod = cachedModules[uri]                          //将cachedModules[uri]属性赋值给mod变量

      if (mod.dependencies.length) {                        //检测dependencies值长度是否是0，类型为[]，不为0，继续执行  即检测此module是否依赖于其他的module
        loadWaitings(function(circular) {
          mod.status < STATUS_SAVED ? fetch(uri, cb) : cb()  //如果module的status<2则执行fetch 否则执行cb(),说明cimodule所依赖的这个module已经加载完成了
          function cb() {
            done(circular)
          }
        })
      }
      else {                                               //如果此module不依赖其他的module，status<3，则执行done(),都则执行fetch
        mod.status < STATUS_SAVED ?
            fetch(uri, loadWaitings) : done()
      }

      function loadWaitings(cb) {
        cb || (cb = done)                                   //调用loadWaittings没有参数或者参数为undefined时，设置cb=done()函数

        var waitings = getUnloadedUris(mod.dependencies)   //检测模块所依赖模块中未被加载的模块uri
        if (waitings.length === 0) {                        //如果所有依赖的模块都已经加载了或者没有依赖的模块，执行callback（）--cb
          cb()
        }
        // Break circular waiting callbacks
        else if (isCircularWaiting(mod)) {                  //如果有依赖的模块并且没有全部没加载 ，在执行109 else 代码块中的load（）函数时会进入这个代码块
          printCircularLog(circularStack)                    //输出stack信息
          circularStack.length = 0                           //将变量circularStack 数组清空
          cb(true)                                          //执行callback(true)
        }
        // Load all unloaded dependencies
        else {                                              //如果有依赖的模块并且没有全部没加载  并且waitingsList[mod.uri] 并没有值， 此时将此模块所依赖的未加载的所有模块uri[] 赋值给 waitingsList[uri]  值为一个数组
          waitingsList[uri] = waitings
          load(waitings, cb)                                 //当加载完成后执行cb此 cb只能是83行中的loadWaitings（callback）
        }
      }

      function done(circular) {
        if (!circular && mod.status < STATUS_LOADED) {                  //如果参数circular==undefined并且模块的staus<3,则说明此模块已经加载了，
          mod.status = STATUS_LOADED                                    //并设置此module的status=3
        }

        if (--remain === 0) {                                            //如果未加载的unloadedUris数目为1，则执行callback()
          callback()
        }
      }

    })(unloadedUris[i])
  }
}

function fetch(uri, callback) {                                            //获取module
  cachedModules[uri].status = STATUS_FETCHING                               //执行此函数第一件事将此module的status设置为1，表示为已经获取到此模块

  // Emit `fetch` event for plugins such as plugin-combo
  var data = { uri: uri }                                                  //将uri储存到data对象中
  emit("fetch", data)                                                      //执行自定义fetch事件 ，将data数据传给fetch的callback函数并执行 如果没有fetch事件，则什么都不做
    var requestUri = data.requestUri || uri                               //如果 emit("fetch", data) 返回data.requestUri则将其赋值给 requestUri，否则直接使用uri

  if (fetchedList[requestUri]) {                                          //如果fetchedList对象中存在 requestUri属性，则直接执行callback()函数 并返回
    callback()
    return
  }

  if (fetchingList[requestUri]) {                                          //如果fetchingList对象中存在 requestUri属性，则将callback函数添加到callbackList[requestUri]数组的后面
    callbackList[requestUri].push(callback)                                //将回调函数存在callbackList对象的 requestUri属性中
    return
  }

  fetchingList[requestUri] = true                                         //如果没有加载过此module将 fetchingList的requestUri的值设置为 true
  callbackList[requestUri] = [callback]                                   //并将 callbackList对象的 requestUri值设置为callback函数

  // Emit `request` event for plugins such as plugin-text
  var charset = configData.charset                                        //获取configData.charset  默认charset=utf-8
  emit("request", data = {                                                //执行自定义事件request，传data数据给request的callback函数并执行，如果没有request，则什么都不做
    uri: uri,
    requestUri: requestUri,
    callback: onRequested,
    charset: charset
  })

  if (!data.requested) {                                                 //如果不存在 !data.requested 执行 request()  注意line 134，可能是设置 data.requested
    request(data.requestUri, onRequested, charset)                       //请求完事后执行回调函数
  }

  function onRequested() {                                             //request()的callback()
    delete fetchingList[requestUri]                                    //删除正在请求的module的信息  即删除fetchingList的 requestUri属性
    fetchedList[requestUri] = true                                     //将请求到的module的信息存    即添加fetchedList的 requestUri属性为 ture

    // Save meta data of anonymous module
    if (anonymousModuleData) {                                          //如果有 anonymousModuleData  如果不存在，说明在模块请求到之后，程序已经自动解析到了uri，并进行了储存
      save(uri, anonymousModuleData)                                    //将此module和对应的uri储存
      anonymousModuleData = undefined                                   //将anonymousModuleData设置为undefined
    }

    // Call callbacks                                                    //module加载完成后执行回调函数
    var fn, fns = callbackList[requestUri]                              //将callbackList[]赋值给fns
    delete callbackList[requestUri]                                    //删除callbackList[requestUri]
    while ((fn = fns.shift())) fn()                                    //将callback（）一个一个执行后执行      fns为数组
  }
}

function define(id, deps, factory) {                                   //定义module       //只要请求到了模块，此函数会自动对所加载的module加载运行
  // define(factory)
  if (arguments.length === 1) {                                         //如果所有的参数只有一个，将id值付给factory，将id的值设置为undefined
    factory = id                                                        //意思就是没有id 和deps参数，但是只有一个参数默认是将其值赋给id，需要做一下转换
    id = undefined
  }

  // Parse dependencies according to the module factory code
  if (!isArray(deps) && isFunction(factory)) {                        //如果参数deps不是[],并且参数factory为function     一般情况下，此模块所依赖的其他模块都要写在一个一位数组中deps 但是如果不存在deps，就要在factory函数中提取索要依赖的module
    deps = parseDependencies(factory.toString())                      //通过使用 parseDependencies()将参数factory中所依赖的module id提取出来并赋值给deps，[]

  }

  var data = { id: id, uri: resolve(id), deps: deps, factory: factory }     //定义data对象
  // Try to derive uri in IE6-9 for anonymous modules                       //针对IE6-9尝试推导出任意module的uri
  if (!data.uri && doc.attachEvent) {                                       //如果不催在data.uri并且浏览器的document对象没有attechEvent属性
    var script = getCurrentScript()                                        //调用getCurrentScript() 返回正在加载的 script

    if (script) {                                                          //如果返回了正在加载的script
      data.uri = script.src                                                //将正在加载的script.uri赋值给data.uri
    }
    else {                                                                //如果没有获取当前正在加载的script，输出信息：无法导出factory
      log("Failed to derive: " + factory)

      // NOTE: If the id-deriving methods above is failed, then falls back    //如果上述的id推导方法都失败，则需要使用onload 事件获取uri
      // to use onload event to get the uri
    }
  }

  // Emit `define` event, used in plugin-nocache, seajs node version etc
  emit("define", data)                                                       //执行自定义事件 define，传data参数给define事件的回调函数并运行

  data.uri ? save(data.uri, data) :                                          //如果load module成功后并解析到data.uri    执行save（）将对应的数据存储在cachedModules[uri]所对应的属性中
      // Save information for "saving" work in the script onload event       //同时save（）函数还会将此module的status设置为3  saved
      anonymousModuleData = data                                             //如果不存在data.uri，则将data对象的属性赋给anonymousModuleData
}                                                                            //不是define()定义的module没有id deps 的参数

function save(uri, meta) {                                                 //保存属性
  var mod = getModule(uri)                                                  //通过getModule()获取对应uri所对应的的cachedModules[uri]对象

  // Do NOT override already saved modules
  if (mod.status < STATUS_SAVED) {                                          //如果这个module的 cachedModules[uri].status属性<3
    // Let the id of anonymous module equal to its uri                      //让匿名模块的id等于它的uri
    mod.id = meta.id || uri

    mod.dependencies = resolve(meta.deps || [], uri)                         //保存achedModules[uri].dependencies属性    通过resolve()返回依赖module的完整路径  []
    mod.factory = meta.factory                                               //保存achedModules[uri].factory 属性

    if (mod.factory !== undefined) {                                         //如果factory有定义，将achedModules[uri].status 属性的值设置为3
      mod.status = STATUS_SAVED
    }
  }
}

function exec(mod) {                                                        //运行这个Module
  // Return `null` when `mod` is invalid                                      //当参数不是一个Module的实例，返回null
  if (!mod) {
    return null
  }

  // When module is executed, DO NOT execute it again. When module
  // is being executed, just return `module.exports` too, for avoiding
  // circularly calling
  if (mod.status >= STATUS_EXECUTING) {                                      //这个模块已经被执行完毕status>4,对外部提供接口
    return mod.exports
  }

  mod.status = STATUS_EXECUTING                                               //设置状态为这个module正在被执行


  function resolveInThisContext(id) {
    return resolve(id, mod.uri)
  }

  function require(id) {                                                               //获取对应id模块的接口
    return getExports(cachedModules[resolveInThisContext(id)])
  }

  require.resolve = resolveInThisContext                                                 //返回路径

  require.async = function(ids, callback) {                                             //异步加载
    use(resolveInThisContext(ids), callback)
    return require
  }


  var factory = mod.factory                                                     //获取这个Module实例的factory函数

  var exports = isFunction(factory) ?                                           //如果factory是函数，执行此函数，并将return 赋给exports，如果不是function，直接将factory赋给exports
      factory(require, mod.exports = {}, mod) :
      factory

  mod.exports = exports === undefined ? mod.exports : exports
  mod.status = STATUS_EXECUTED                                                    //此模块已经被执行，设置状态信息

  return mod.exports                                                             //向外部提供这个Module实例的接口
}

Module.prototype.destroy = function() {                            //给module定义一个原型方法，用于删除加载的module实例
  delete cachedModules[this.uri]
  delete fetchedList[this.uri]
}


// Helpers

function getModule(uri) {                                           //通过uri获取module的信息，如果cachedModules缓存中没有
  return cachedModules[uri] ||                                      //uri所对应的的module信息，则new 一个新的
      (cachedModules[uri] = new Module(uri))                        //Module，并且所有信息都是初始值
}

function getUnloadedUris(uris) {                                    //检测所有未加载module的uri ，并将所有
  var ret = []                                                      //未加载的module uri保存到局部数组变量
                                                                     //ret中返回
  for (var i = 0; i < uris.length; i++) {
    var uri = uris[i]
    if (uri && getModule(uri).status < STATUS_LOADED) {             //status<3
      ret.push(uri)
    }
  }

  return ret
}

function getExports(mod) {                                          //获取模块的对外接口exports
  var exports = exec(mod)
  if (exports === null && (!mod || !IS_CSS_RE.test(mod.uri))) {     //如果exports为null并且不存在这个Module的实例，并且这个Module的实例不是css文件 触发下面的自定义 error事件
    emit("error", mod)
  }
  return exports
}

var circularStack = []                                   //定义circularStack为空数组         //当load(uris) 中的参数uris.length>1的时候才会用到此变量？？？

function isCircularWaiting(mod) {
  var waitings = waitingsList[mod.uri] || []              //如果存在此module的uri属性，将其值赋给waitings变量；如果不存在，将空数组赋给waitings变量  //多层调用
  if (waitings.length === 0) {                            //如果waitings数组为空，则跳出
    return false
  }

  circularStack.push(mod.uri)                              //此mod.uri重复加载了  之前的stack中已经执行了此uri的load（），但是需要加载依赖模块，所以并未加载完成，需要等待依赖模块加载完成之后才能执行到这个stack
  if (isOverlap(waitings, circularStack)) {                //模块所依赖其他模块的uri[]，有没有在stack中等待加载，如果有，删除它
    cutWaitings(waitings)                                  //删除操作     ?????暂时热为解决 A->[B,C,A] 类型的module
    return true
  }

  for (var i = 0; i < waitings.length; i++) {              //如果此module之前有在stack中并且它所依赖的module都没有在stack中
    if (isCircularWaiting(cachedModules[waitings[i]])) {    //检测它所依赖模块 是否isCircularWaiting 即它依赖的模块的依赖模块有在stack中等待加载  返回ture
      return true
    }
  }
                                                             //如果此module所依赖的所有子孙module都没有在stack中等待加载 删除    circularStack.push(mod.uri)   添加进去的uri
  circularStack.pop()                                        //删除添加进来的重复uri数据
  return false
}

function isOverlap(arrA, arrB) {                                 //比较两个数组中有没有相同的uri，如果有返回 ture 如果没有返回false
  for (var i = 0; i < arrA.length; i++) {                        //如果有相同的，证明模块当前uri 所依赖的模块已经在前一个load（）中callback等待加载了
    for (var j = 0; j < arrB.length; j++) {                      //arrB为将已经等待加载的module对应的uri存到 circularStack数组中
      if (arrB[j] === arrA[i]) {                                 //判断waitingsList[uri]中是否在stack中已经等待加载了
        return true
      }
    }
  }
  return false
}

function cutWaitings(waitings) {                                //将 waitingsList[mod.uri] 中已经在stack中等待加载的模块删除 ：：A->[B,C,A]自身依赖自己
  var uri = circularStack[0]

  for (var i = waitings.length - 1; i >= 0; i--) {
    if (waitings[i] === uri) {
      waitings.splice(i, 1)
      break
    }
  }
}

function printCircularLog(stack) {                                            //输出stack信息
  stack.push(stack[0])
  log("Circular dependencies: " + stack.join(" -> "))
}

function preload(callback) {                                                      //使用 preload 配置项，可以在普通模块加载前，提前加载并初始化好指定模块
  var preloadMods = configData.preload                                            //configData.preload 是一维数组
  var len = preloadMods.length                                                    //获取一维数组的长度

  if (len) {                                                                      //检测配置文件中是否配置了preload属性
    use(resolve(preloadMods), function() {                                       //参考seajs.use  说明
      // Remove the loaded preload modules
      preloadMods.splice(0, len)                                                  //preloadModes=[]

      // Allow preload modules to add new preload modules                        //允许预加载模块加载新的预加载模块
      preload(callback)
    })
  }
  else {                                                                        //如果没有配置preload，则直接执行callpack()
    callback()
  }
}


// Public API

seajs.use = function(ids, callback) {                                          //seajs.use
  // Load preload modules before all other modules
  preload(function() {                                                         //使用预加载
    use(resolve(ids), callback)                                                 //resolve(ids),将ids解析为一维数组 格式为http://path/to/a.js or https://path/to/a.css
  })                                                                            //参数ids 不能为多维数组 在resolve()处有说明
  return seajs                                                                 //返回seajs ---链式编程
}
                                                                                  //加载module
Module.load = use                                                                 //Module.load
seajs.resolve = id2Uri                                                            //seajs.resolve    获取模块的路径
global.define = define

seajs.require = function(id) {                                                   //获取接口
  return (cachedModules[id2Uri(id)] || {}).exports
}

