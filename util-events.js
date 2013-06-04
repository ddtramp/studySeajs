/**
 * util-events.js - The minimal events support
 */

var eventsCache = seajs.events = {}                                                //定义eventsCache指向seajs.events

// Bind event
seajs.on = function(event, callback) {                                            //全局绑定自定义事件的方法
  if (!callback) return seajs                                                     //如果事件没有绑定任何callback()，则无任何意义，直接返回

  var list = eventsCache[event] || (eventsCache[event] = [])                       //如果已经定义过这个事件了，则将保存自定义事件毁掉函数的数组赋给变量list，否则赋给[]
  list.push(callback)                                                              //将回调函数添加到list数组的最后

  return seajs                                                                    //链式编程
}

// Remove event. If `callback` is undefined, remove all callbacks for the            //移除事件方法
// event. If `event` and `callback` are both undefined, remove all callbacks
// for all events
seajs.off = function(event, callback) {
  // Remove *all* events
  if (!(event || callback)) {                                                       //如果没有定义要移除的事件和callback（）都为undefined，则删除所有事件
    seajs.events = eventsCache = {}
    return seajs                                                                   //返回seajs for 链式编程
  }

  var list = eventsCache[event]
  if (list) {                                                                       //检测是否有这个事件，如果没有直接返回seajs
    if (callback) {                                                                 //删除event的callback
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i] === callback) {
          list.splice(i, 1)
        }
      }
    }
    else {
      delete eventsCache[event]                                                     //如果没有定要要移除这个事件的这个个回调函数，则删除这个事件
    }
  }

  return seajs                                                                    //返回seajs for 链式编程
}

// Emit event, firing all bound callbacks. Callbacks are passed the same
// arguments as `emit` is, apart from the event name
var emit = seajs.emit = function(event, data) {                                  //触发事件方法  调用所用callback
  var list = eventsCache[event], fn

  if (list) {                                                                      //是否存在这个事件
    // Copy callback lists to prevent modification                                 //防止修改原始的list
    list = list.slice()

    // Execute event callbacks
    while ((fn = list.shift())) {
      fn(data)
    }
  }

  return seajs                                                                     //链式编程
}

