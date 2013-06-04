/**
 * util-lang.js - The minimal language enhancement
 */

function isType(type) {                                                                           //定以函数 返回值是一个函数
  return function(obj) {
    return Object.prototype.toString.call(obj) === "[object " + type + "]"
  }
}
                                                                                                   //定义检测函数
var isObject = isType("Object")
var isString = isType("String")
var isArray = Array.isArray || isType("Array")
var isFunction = isType("Function")

