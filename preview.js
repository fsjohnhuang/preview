/**
 * @author fsjohnuang
 * @version 1.0.2
 * @description 图片预览
 */
;(function(exports){
	// 工具
	var utils = {};
	utils.trim = function(str){
		return /^\s*(\S*)\s*$/.exec(str)[1];
	};

	/**
	 配置项
	**/
	var imgCls = 'data-preview-img';
	var filter = ['progid',
		'DXImageTransform.Microsoft.AlphaImageLoader',
		'(sizingMethod="scale")'];
	var MIME_EXT_MAP = {
		'jpeg': 'image/jpeg',
		'jpg': 'image/jpg',
		'gif': 'image/gif',
		'png': 'image/png'
	};

	/**
	 特征检测
	 v1.0.1 修复document.body为生成时，特征检测报错的bug
	**/
	var useFilter = !!(document.documentElement.filters && document.documentElement.filters.item);

	/**
	 兼容性处理
	**/
	var on, off;
	//v1.0.1 修复document.body为生成时，特征检测报错的bug
	document.documentElement.addEventListener &&
		(on = function(el, evt, fn){
			el.addEventListener(evt, fn);
		},
		off = function(el, evt, fn){
			el.removeEventListener.apply(el, Array.prototype.slice.call(arguments,1));
		}) || 
		(on = function(el, evt, fn){
			el.attachEvent('on' + evt, fn);
		},
		off = function(el, evt, fn){
			var args = Array.prototype.slice.call(arguments,1);
			args[0] = 'on' + args[0];
			el.detachEvent.apply(el, args);
		});
	var URL = (function(URL){
		if (!URL) return;

		var cache = {};
		return {
			createObjectURL: function(blob){
				var url = URL.createObjectURL(blob);
				cache[url] = blob;
				return url;
			},	
			revokeObjectURL: function(blob){
				URL.revokeObjectURL(blob);
			},
			popBlob: function(url){
				var blob = cache[url];
				delete cache[url];
				return blob;
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
	var render = function(){
		render[arguments.length].apply(this, arguments);
	};
	/** 现代浏览器显示预览图 
	 * @param {DOMString} src 图片地址
	 * @param {HTMLElement} previewEl 预览图元素
	 */
	render[2] = function(src, previewEl){
		var imgs = previewEl.getElementsByClassName(imgCls), img;
		if (!!src){
			if (img = imgs[0]){
				// 释放window.URL.createObjectURL生成的链接所独占的资源
				if (!!URL)
					URL.revokeObjectURL(URL.popBlob(img.src));
			}
			else{
				img = new Image();
				img.className = imgCls;
				img.style.width = previewEl.offsetWidth + 'px';
				img.style.height = previewEl.offsetHeight + 'px';
				previewEl.appendChild(img);
			}
			img.src = src;
		}
		else if(img = imgs[0]){
			if (!!URL)
				URL.revokeObjectURL(URL.popBlob(img.src));
			img.remove();
		}
	};
	/** IE10以下显示预览图 
	 * @param {DOMString} src 图片地址
	 * @param {HTMLElement} previewEl 预览图元素
	 * @param {Function} isExpectedMIME 文件后缀检测函数
	 */
	render[3] = function(src, previewEl, isExpectedMIME){
		var ext = src.substring(src.lastIndexOf('.') + 1);
		if (isExpectedMIME(MIME_EXT_MAP[ext]))
			previewEl.filters.item(filter[1]).src = src;
	}
	var exec= function(){
		exec[arguments.length].apply(this, arguments);
	};
	/** 现代浏览器执行预览操作 
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEl 预览图元素
	 */
	exec[2] = function(fileEl, previewEl){
		readAsDataURL(fileEl.files[0], function(url){
			render(url, previewEl);	
		});
	};
	/** IE10以下执行预览操作 
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEl 预览图元素
	 * @param {Function} isExpectedMIME 文件后缀检测函数
	 */
	exec[3] = function(fileEl, previewEl, isExpectedMIME){
		var url = readPath(fileEl);	
		render(url, previewEl, isExpectedMIME);
	};

	/** 构造图片预览组件
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEl 预览区域元素，建议使用div
	 */
	var pv = exports.Preview = function(fileEl, previewEl){
		if (!(this instanceof pv)) return new pv(fileEl, previewEl);

		// IE10以下版本浏览器进行文件后缀校验
		var isExpectedMIME = useFilter && (previewEl.style.filter = filter[0] + ':' + filter[1] + filter[2] 
			, (function(accept){
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
			}(fileEl.accept || 'image/*')));

		on(fileEl, 'change', function(){
			var args = [fileEl, previewEl];
			if (isExpectedMIME)
				args.push(isExpectedMIME);
			exec.apply(this, args);
		});

		
	};
}(window));