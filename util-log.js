/**
 * util-log.js - The tiny log function
 */

// The safe wrapper for `console.xxx` functions
// log("message") ==> console.log("message")
// log("message", "warn") ==> console.warn("message")
var log = seajs.log = function(msg, type) {                              //定义输出信息全局变量

  global.console &&                                                        //检测是否有console
      // Do NOT print `log(msg)` in non-debug mode                         //在没开启debug模式下不输出信息
      (type || configData.debug) &&
      // Set the default value of type
      (console[type || (type = "log")]) &&                                 //设置默认type
      // Call native method of console
      console[type](msg)                                                   //执行
}

