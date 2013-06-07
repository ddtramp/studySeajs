            此资源只是本人学习之用

如果有人看到这个并且觉得我的解释不对，请联系我
  
  wangxichao001@gmail.com
########################################### 
关于jquery
	seajs module 在使用jquery框架时，有两种加载方式：
	1.就像在seajs模块中引入的一样，设置alias ==   这里的jquery被改造了，
	  里面添加了代码，应用seajs模块定义规范和没有冲突的设置
	  所有模块都是异步加载的   
	  如果seajs之后还有其他模块使用到了jquery框架，不能保证jquery已经加载完成
		line 9578	
					// Expose jQuery to the global object
					window.jQuery = window.$ = jQuery;

					// Expose jQuery as an AMD module, but only for AMD loaders that
					// understand the issues with loading multiple versions of jQuery
					// in a page that all might call define(). The loader will indicate
					// they have special allowances for multiple jQuery versions by
					// specifying define.amd.jQuery = true. Register as a named module,
					// since jQuery can be concatenated with other files that may use define,
					// but not use a proper concatenation script that understands anonymous
					// AMD modules. A named AMD is safest and most robust way to register.
					// Lowercase jquery is used because AMD module names are derived from
					// file names, and jQuery is normally delivered in a lowercase file name.
					// Do this after creating the global so that if an AMD module wants to call
					// noConflict to hide this version of jQuery, it will work.
					if ( typeof define === "function"  ) {
						define("jquery/jquery/1.9.1/jquery-debug", [], function () { return jQuery; } );
					}

					})( window );

					;$.noConflict();
		
	2.在seajs之前引入原版的jquery 这样拥有全局的$,针对不是seajs模块的其他js来说，保证再其
	  依赖jquery之前就已经将jquery引入并且暴露出$和jquery 变量
	  但是无法保证其他模块的$冲突问题

###########################################

查看文件的顺序：
        
		sea-debug.js               ----下面文件的集合
		
		intro.js",
        sea.js",

        util-lang.js",
        util-log.js",
        util-events.js",
        util-path.js",
        util-request.js",
        util-deps.js",

        module.js",
        config.js",
        bootstrap.js",

        outro.js"
        
		
####源码下载：
		
		https://github.com/seajs/seajs
		
		cd 存放目录
        git clone https://github.com/seajs/seajs.git