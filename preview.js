/**
 * @author fsjohnuang
 * @version 1.2.0
 * @description 纯前端图片预览组件
 */
;(function(exports){
	// 工具
	var utils = {};
	utils.trim = function(str){
		return /^\s*(\S*)\s*$/.exec(str)[1];
	};
	utils.preset = function(fn){
		var presetArgs = [].slice.call(arguments, 1);
		return function(){
			fn.apply(null, presetArgs.concat([].slice.call(arguments)));
		};
	};
	utils.extend = function(){
		var ret = {};
		for (var i = 0, len = arguments.length, arg; i < len; ++i){
			if (arg = arguments[i]){
				for (var p in arg){
					if (!ret.hasOwnProperty(p)){
						ret[p] = arg[p];
					}
				}
			}
		}
		return ret;
	};

	/**
	 配置项
	**/
	var imgCls = 'data-preview-img',
		FILTER_NAME= 'DXImageTransform.Microsoft.AlphaImageLoader',
		FILTER= ' progid:' + FILTER_NAME + '(sizingMethod="scale")';
	var MIME_EXT_MAP = {
		'jpeg': ['image/jpeg'],
		'jpg': ['image/jpeg'],
		'gif': ['image/gif'],
		'png': ['image/png', 'image/x-png'],
		'tiff': ['image/tiff'],
		'bmp': ['image/x-ms-bmp', 'image/bmp']
	};

	/**
	 特征检测
	 v1.0.1 修复document.body未生成时，特征检测报错的bug
	**/
	var useFilter = !!(document.documentElement.filters && document.documentElement.filters.item);
	var isIE11 = document.documentMode === 11;

	/**
	 兼容性处理
	**/
	var on, off;
	//v1.0.1 修复document.body未生成时，特征检测报错的bug
	if (document.documentElement.addEventListener){
		on = function(el, evt, fn){
			el.addEventListener(evt, fn);
		};
		off = function(el, evt, fn){
			el.removeEventListener.apply(el, Array.prototype.slice.call(arguments,1));
		};
	}
	else{
		on = function(el, evt, fn){
			el.attachEvent('on' + evt, fn);
		};
		off = function(el, evt, fn){
			var args = Array.prototype.slice.call(arguments,1);
			args[0] = 'on' + args[0];
			el.detachEvent.apply(el, args);
		};
	}
	var URL = (function(URL){
		if (!URL) return;

		return {
			createObjectURL: function(blob){
				return URL.createObjectURL(blob);
			},	
			revokeObjectURL: function(url){
				URL.revokeObjectURL(url);
			}
		};
	}(window.webkitURL || window.URL));

	/**
	 主逻辑
	**/
	/** 现代浏览器获取图片地址
	 * @param {File} file 文件对象
	 * @param {Function} cb({DOMString} dataURIScheme) 回调函数
	 */
	var readAsDataURL = function(file, cb/*({DOMString} dataURIScheme)*/){
		// 空文件则返回空字符串
		if (!file) return cb('');

		if (!!URL){
			// 使用window.URL.createObjectURL提高性能
			cb(URL.createObjectURL(file));
		}
		else if (!window.FileReader){
			// ff3.0不支持FileReader
			cb(file.readAsDataURL());
		}
		else{
			var fr = new window.FileReader();
			on(fr, 'load', function(e){
				cb(e.target.result);
			});
			fr.readAsDataURL(file);
		}
	};
	/** IE10以下获取图片地址
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @return {DOMString} url
	 */
	var readPath = function(fileEl){
		var src = fileEl.value || '';
		// IE11下，文档模式小于10无法通过value、getAttribute和outerHTML获取input[type=file]的真实路径
		if (src.search(/\w:\\fakepath/) === 0){
			fileEl.select();	
			src = document.selection.createRangeCollection()[0].htmlText;
		}
		return src;
	};
	/** 清理预览图的渲染
	 * @param {HTMLElement} previewEl 预览图区域元素
	 * @param {Boolean} [isRemove=false] 是否将预览图IMG元素从DOM树移除
	 */
	var clearRender = function(previewEl, isRemove){
		var img = previewEl.getElementsByClassName(imgCls)[0];
		if (!img) return null;

		// 释放window.URL.createObjectURL生成的链接所独占的资源
		URL && URL.revokeObjectURL(img.src);
		if (isRemove){
			// IE10+只有removeNode没有remove方法
			img[img.remove && 'remove' || 'removeNode'].call(img);
			img = null;
		}

		return img;
	};
	/** 检查文件后缀是否与file的accept属性值匹配，并触发事件
	 * @param {PlainObject} _ Preview实例内置配置项
	 * @param {DOCString} src 文件路径
	 * @param {Function} isExpectedMIME 检查文件后缀的函数
	 * @param {Boolean} 是否渲染预览图
	 */
	var isRender = function(_, src, isExpectedMIME){
		var ext = '';
		var lastFullStopIndex = src.lastIndexOf('.');
		if (lastFullStopIndex > 0)
			ext = src.substring(lastFullStopIndex + 1);
		var ret = _.opts[isExpectedMIME(MIME_EXT_MAP[ext])?'onlegal':'onillegal']
			.call(_.self, src, ext, _.accept);
		return ret;
	};
	var render = function(){
		render[useFilter ? 'legacy' : 'modern'].apply(null, arguments);
	};
	/** 现代浏览器显示预览图 
	 * v1.0.2修复src为undefined或null时图片显示出错的bug
	 * @param {PlainObject} _ Preview实例内置配置项
	 * @param {DOMString} src 图片地址
	 * @param {HTMLElement} previewEl 预览图元素
	 * @param {Function} isExpectedMIME 文件后缀检测函数
	 */
	render['modern'] = function(_, src, previewEl, isExpectedMIME){
		var img = clearRender(previewEl, !src);
		if (src){ 
			if (isRender(_, _.fileEl.files[0].name, isExpectedMIME)){
				if (!img){
					img = new Image();
					img.className = imgCls;
					img.style.width = previewEl.offsetWidth + 'px';
					img.style.height = previewEl.offsetHeight + 'px';
					previewEl.appendChild(img);
				}
				img.src = src;
			}
		}
	};
	/** IE10以下显示预览图 
	 * @param {PlainObject} _ Preview实例内置配置项
	 * @param {DOMString} src 图片地址
	 * @param {HTMLElement} previewEl 预览图元素
	 * @param {Function} isExpectedMIME 文件后缀检测函数
	 */
	render['legacy'] = function(_, src, previewEl, isExpectedMIME){
		if (isRender(_, src, isExpectedMIME))
			previewEl.filters.item(FILTER_NAME).src = src;
	}
	var exec= function(){
		exec[useFilter ? 'legacy' : 'modern'].apply(null, arguments);
	};
	/** 现代浏览器执行预览操作 
	 * @param {PlainObject} _ Preview实例内置配置项
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEl 预览图元素
	 * @param {Function} isExpectedMIME 文件后缀检测函数
	 */
	exec['modern'] = function(_, fileEl, previewEl, isExpectedMIME){
		readAsDataURL(fileEl.files[0],
			utils.preset(function(_, url){
				render(_, url, previewEl, isExpectedMIME);	
			}, _));
	};
	/** IE10以下执行预览操作 
	 * @param {PlainObject} _ Preview实例内置配置项
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEl 预览图元素
	 * @param {Function} isExpectedMIME 文件后缀检测函数
	 */
	exec['legacy'] = function(_, fileEl, previewEl, isExpectedMIME){
		var url = readPath(fileEl);	
		render(_, url, previewEl, isExpectedMIME);
	};
	/** 重置预览图渲染
	 * @param {HTMLElement} 预览图区域元素
	 */
	var resetRender = function(previewEl){
		if (useFilter){
			// 滤镜AlphaImageLoader的src为无效路径时会抛出Error
			// 因此需要重置滤镜
			previewEl.style.filter = previewEl.style.filter.replace(FILTER,'');
			setTimeout(function(){
				previewEl.style.filter += FILTER;
			}, 0);
		}
		else{
			clearRender(previewEl, true);
		}
	};
	var frm4Reset;
	/** 重置input[type=file]元素的value值
	 * @param {HTMLFileElement} 文件上传元素
	 */
	var resetVal = function(fileEl){
		if (document.documentMode && document.documentMode < 11){
			// IE10及以下版本无法通过js修改value
			// 需要通过附加到非渲染的form元素实现重置
			var p = fileEl.parentNode, n = fileEl.nextSibling;
			frm4Reset = frm4Reset || document.createElement('form');
			frm4Reset.appendChild(fileEl);
			frm4Reset.reset();
			p.insertBefore(fileEl, n);
		}
		else{
			fileEl.value = '';
		}
	};

	/** 构造图片预览组件
	 * 参数的位置可互换
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEl 预览区域元素，建议使用div
	 * @param {PlainObject} opts 配置项
	 */
	var pv = exports.Preview = function(arg1, arg2, opts){
		if (2 > arguments.length) throw Error("Failed to execute 'Preview': 2 over arguments required, but only " + arguments.length + " present");
		if (!(this instanceof pv)) return new pv(arg1, arg2);

		// 私有属性, 建议使用者不要随便修改
		var _ = this._ = {};
		_.self = this;
		for (var i = 0, arg; i < 2 && (arg = arguments[i++]);){
			if (arg.nodeName === 'INPUT' && arg.type === 'file')
				_.fileEl = arg;
			else
				_.previewEl = arg;
		}
		if (!_.fileEl) throw Error("Failed to execute 'Preview': HTMLInputElement[type=file] required, but there is no one present");

		_.opts = utils.extend(opts, pv.defaults);
		// 将onlegal和onillegal转为函数
		var origLegal, origIllegal;
		if (typeof _.opts.onlegal !== 'function'){
			origLegal = _.opts.onlegal;
			_.opts.onlegal = function(){
				return origLegal;
			};
		}
		if (typeof _.opts.onillegal !== 'function'){
			origIllegal = _.opts.onillegal;
			_.opts.onillegal = function(){
				return origIllegal;
			};
		}

		if (useFilter)
			_.previewEl.style.filter += FILTER;

		// v1.2.0文件后缀校验函数
		var isExpectedMIME = (function(accept){
				// 正则化, 将形如image/*,image/jpg正则化为image/[^\\u002c]+,image/jpg
				accept = accept.replace(/\*/g, function(m){
					return '[^\\u002c]+'; // 使用逗号的unicode字符编码,以便后面以逗号,作为分隔符
				});
				var acceptMIMEs = accept.split(/\s*,\s*/)
					, rAcceptMIMEs = [];
				for (var i = 0, am; am = acceptMIMEs[i++];)
					rAcceptMIMEs.push(RegExp(am));

				/*
				 * @param {DOMString | Array} mimes input[type=file]元素上传文件的MIME类型
				 */ 
				return function(mimes){
					mimes = [].concat(mimes);
					for (var i = 0, r; r = rAcceptMIMEs[i++];){
						for (var j = 0, m; m = mimes[j++];){
							if (r.test(m)) return true;
						}
					}
					return false;
				};
			}(_.accept = _.fileEl.accept || 'image/*'));

		on(_.fileEl, 'change', function(){
				exec(_, _.fileEl, _.previewEl, isExpectedMIME);
			});
	};

	/** 重置图片预览组件
	 */
	pv.prototype.reset = function(){
		var _ = this._;
		resetVal(_.fileEl);
		// IE11修改fileEl.value后会触发change事件，因此不用重置渲染
		isIE11 || resetRender(_.previewEl);
	};

	/** 默认配置
	 */
	pv.defaults = {
		onlegal: true,
		onillegal: false
	};
}(window));