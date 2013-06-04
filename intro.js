/**
 * SeaJS v@VERSION | seajs.org/LICENSE.md
 */
(function(global, undefined) {                                     //global指向widow  此处传给undifind是为了防止此处module内部的undefined被污染
                                                                    //undefind 是可以赋值的
// Avoid conflicting when `sea.js` is loaded multiple times         //防止发生冲突，如果seajs加载多次会发生冲突
var _seajs = global.seajs
if (_seajs && _seajs.version) {
  return
}
