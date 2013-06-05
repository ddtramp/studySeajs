/**
 * util-request.js - The utilities for requesting script and style files
 * ref: tests/research/load-js-css/test.html
 */

var head = doc.getElementsByTagName("head")[0] || doc.documentElement                         //获取head DOM对象
var baseElement = head.getElementsByTagName("base")[0]                                        //获取第一个head 中base DOM对象   base标签 指定基本的地址 ，参考html5中base标签

var IS_CSS_RE = /\.css(?:\?|$)/i                                                             //正则 自己看
var READY_STATE_RE = /^(?:loaded|complete|undefined)$/

var currentlyAddingScript
var interactiveScript

// `onload` event is supported in WebKit < 535.23 and Firefox < 9.0
// ref:
//  - https://bugs.webkit.org/show_activity.cgi?id=38995
//  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
//  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
var isOldWebKit = (navigator.userAgent                                                        //检测是不是老的浏览器 使用的内核是老版本的
    .replace(/.*AppleWebKit\/(\d+)\..*/, "$1")) * 1 < 536


function request(url, callback, charset) {                                                   //发送请求
  var isCSS = IS_CSS_RE.test(url)                                                             //是否是css文件
  var node = doc.createElement(isCSS ? "link" : "script")                                    //如果请求的是css文件 则创建link tag ，如果不是则创建 script tag

  if (charset) {                                                                             //检测有没有设置编码格式 如果有 并且为函数，将参数url传给charset函数处理并返回编码给cs，如果不是函数 将charset直接付给cs变量
    var cs = isFunction(charset) ? charset(url) : charset
    if (cs) {                                                                               //检测变量cs是否存在 有没有值  如果有 则设置 DOM对象node的charset属性为cs
      node.charset = cs
    }
  }

  addOnload(node, callback, isCSS)                                                           //执行添加事件

  if (isCSS) {
    node.rel = "stylesheet"
    node.href = url
  }
  else {
    node.async = true
    node.src = url
  }

  // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
  // the end of the insert execution, so use `currentlyAddingScript` to
  // hold current node, for deriving url in `define` call
  currentlyAddingScript = node

  // ref: #185 & http://dev.jquery.com/ticket/2709
  baseElement ?                                                                     //将创建的dom 对象插到文档中  这里只是选择要不要插入到head 中base标签之前
      head.insertBefore(node, baseElement) :                                        //插入到文档之后，开始加载
      head.appendChild(node)

  currentlyAddingScript = undefined
}

function addOnload(node, callback, isCSS) {                                         //
  var missingOnload = isCSS && (isOldWebKit || !("onload" in node))                 //如果是Css文件并且是过时的浏览器

  // for Old WebKit and Old Firefox
  if (missingOnload) {
    setTimeout(function() {
      pollCss(node, callback)                                                        //使用pollCss方法加载css文件
    }, 1) // Begin after node insertion
    return
  }

  node.onload = node.onerror = node.onreadystatechange = function() {                //给DOM对象node添加onload事件
    if (READY_STATE_RE.test(node.readyState)) {

      // Ensure only run once and handle memory leak in IE                            //确保只运行一次并且处理内存泄露问题
      node.onload = node.onerror = node.onreadystatechange = null

      // Remove the script to reduce memory leak                                      //删除脚本减少内存泄露
      if (!isCSS && !configData.debug) {
        head.removeChild(node)
      }

      // Dereference the node                                                         //取消多这个节点引用
      node = undefined

      callback()                                                                      //执行回调函数
    }
  }
}

function pollCss(node, callback) {                                                   //加载css
  var sheet = node.sheet                                                              //获取link属性 CSSStyleSheet {rules: CSSRuleList, cssRules: CSSRuleList, ownerRule: null, media: MediaList, title: null…}
  var isLoaded

  // for WebKit < 536
  if (isOldWebKit) {                                                                  //如果是过时的WebKit内核浏览器并且有sheet属性
    if (sheet) {
      isLoaded = true                                                                //将isLoaded值设置为true
    }
  }
  // for Firefox < 9.0
  else if (sheet) {                                                                  //针对firefox版本小于9 检测加载是否完成，针对ff的bug     z
    try {
      if (sheet.cssRules) {
        isLoaded = true
      }
    } catch (ex) {
      // The value of `ex.name` is changed from "NS_ERROR_DOM_SECURITY_ERR"
      // to "SecurityError" since Firefox 13.0. But Firefox is less than 9.0
      // in here, So it is ok to just rely on "NS_ERROR_DOM_SECURITY_ERR"
      if (ex.name === "NS_ERROR_DOM_SECURITY_ERR") {
        isLoaded = true
      }
    }
  }

  setTimeout(function() {                                                             //循环检测这个文件是否被加载完成
    if (isLoaded) {
      // Place callback here to give time for style rendering
      callback()
    }
    else {
      pollCss(node, callback)
    }
  }, 20)
}

function getCurrentScript() {                                                            //获取正在加载的DOM对象  解决IE bug的
  if (currentlyAddingScript) {
    return currentlyAddingScript
  }

  // For IE6-9 browsers, the script onload event may not fire right
  // after the the script is evaluated. Kris Zyp found that it
  // could query the script nodes and the one that is in "interactive"
  // mode indicates the current script
  // ref: http://goo.gl/JHfFW
  if (interactiveScript && interactiveScript.readyState === "interactive") {
    return interactiveScript
  }

  var scripts = head.getElementsByTagName("script")

  for (var i = scripts.length - 1; i >= 0; i--) {
    var script = scripts[i]
    if (script.readyState === "interactive") {
      interactiveScript = script
      return interactiveScript
    }
  }
}

