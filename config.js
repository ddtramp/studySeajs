/**
 * config.js - The configuration for the loader
 */

var configData = config.data = {                                             //默认配置文件信息  设置config.data 的值
  // The root path to use for id2uri parsing
  base: (function() {                                                       //设置基本路径 一般不需要配置  使用这个默认的就好
    var ret = loaderDir

    // If loaderUri is `http://test.com/libs/seajs/[seajs/1.2.3/]sea.js`, the
    // baseUri should be `http://test.com/libs/`
    var m = ret.match(/^(.+?\/)(?:seajs\/)+(?:\d[^/]+\/)?$/)
    if (m) {
      ret = m[1]
    }

    return ret
  })(),

  // The charset for requesting files
  charset: "utf-8",

  // Modules that are needed to load before all other modules
  preload: []

  // debug - Debug mode. The default value is false
  // alias - An object containing shorthands of module id
  // paths - An object containing path shorthands in module id
  // vars - The {xxx} variables in module id
  // map - An array containing rules to map module uri
  // plugins - An array containing needed plugins
}

function config(data) {                                      //data为对象
  for (var key in data) {                                    //循环去取data的值
    var curr = data[key]

    // Convert plugins to preload config
    if (curr && key === "plugins") {                          //如果存在属性crur并且key=plugin
      key = "preload"                                         //将curr=data[plugins]设置成curr=data[preload]=plugin2preload(curr)
      curr = plugin2preload(curr)
    }

    var prev = configData[key]                               //获取此key默认配置信息

    // Merge object config such as alias, vars
    if (prev && isObject(prev)) {                            //如果存在prev并且prev是一个object
      for (var k in curr) {                                 //使用用户配置的内容覆盖掉默认的配置的值
        prev[k] = curr[k]
      }
    }
    else {
      // Concat array config such as map, preload             //如果prev是一个数组  将默认的配置和用户的配置连接成一个数组并将值赋给用户的配置
      if (isArray(prev)) {
        curr = prev.concat(curr)
      }
      // Make sure that `configData.base` is an absolute directory              //如果用户配置了base属性，使用用户配置的base path，
      else if (key === "base") {
        curr = normalize(addBase(curr + "/"))                                   //normalize处理uri addBase 处理uri
      }

      // Set config
      configData[key] = curr                                                     //将用户配置赋值给对应的默认配置  即更改默认配置
    }
  }

  emit("config", data)                                                           //如果有自定义config事件 则data传给config事件的callback函数并执行callback
  return seajs
}

seajs.config = config                                             //给seajs对象添加方法

function plugin2preload(arr) {                                   //返回需要加载的plugin完整路径的数组
  var ret = [], name

  while ((name = arr.shift())) {
    ret.push(loaderDir + "plugin-" + name)
  }
  return ret
}

