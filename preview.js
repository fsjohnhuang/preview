/**
 * @author fsjohnuang
 * @version 0.3
 * @description 图片预览
 */
;(function(exports){
	var _filter = ['progid',
		'DXImageTransform.Microsoft.AlphaImageLoader',
		'(sizingMethod="scale")'];
	var useFilter = !!(document.body.filters && document.body.filters.item);
	var imgCls = 'data-preview-img';

	var _render = function(previewEl, dataURI){
		var imgs = previewEl.getElementsByClassName(imgCls), img;
		if (imgs === null || imgs.length === 0){
			img = new Image();
			img.className = imgCls;
			img.style.width = previewEl.offsetWidth + 'px';
			img.style.height = previewEl.offsetHeight + 'px';
			previewEl.appendChild(img);
		}
		else{
			img = imgs[0];
		}

		img.src = dataURI;
	};

	var MIME_EXT_MAP = {
		'jpeg': 'image/jpeg',
		'jpg': 'image/jpg',
		'gif': 'image/gif',
		'png': 'image/png'
	};

	/*
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEL 预览容器，建议使用div元素
	 */
	var Preview = function(fileEl, previewEl){
		if (!(this instanceof Preview)) return new Preview(fileEl, previewEl);

		var isExpectedMIME = (function(accept){
			// 正则化
			accept = accept.replace(/\*/g, function(m){
				return '[^\\u002c]+'; // 使用逗号的unicode字符编码,以便后面已逗号,作为分隔符
			});
			var acceptMIMEs = accept.split(',');

			/*
			 * @param {DOMString | Array} mimes input[type=file]元素上传文件的MIME类型
			 */ 
			return function(mimes){
				mimes = [].concat(mimes);
				for (var i = 0, am; am = acceptMIMEs[i++];){
					for (var j = 0, m; m = mimes[j++];){
						if (RegExp(am).test(m)) return true;
					}
				}
				return false;
			};
		}(fileEl.accept || 'image/*'));
		
		var readAsDataURL = null;
		// IE5.5~9
		if (useFilter){
			previewEl.style.filter = _filter[0] + ':' + _filter[1] + _filter[2];
		}
		else{
			// 修复ff3.0不支持FileReader的问题
			var fr = null;
			if (!!FileReader){
				fr = new FileReader;
				fr.addEventListener('load', function(e){
					_render(previewEl, e.target.result);
				});
			}

			readAsDataURL = function(file){
				if (!isExpectedMIME(file.type)) return;

				if (!!fr){
					fr.readAsDataURL(file);
				}
				else{
					_render(previewEl, file.readAsDataURL());
				}
			};
		}
		var evtPrefix = '', on = fileEl.addEventListener && 'addEventListener' || (evtPrefix = 'on') && 'attachEvent';
		fileEl[on](evtPrefix + 'change', function(e){
				e = e || window.event;
				if (useFilter){
					var src = e.target.value || '';
					// 解决IE11下，文档模式小于10无法通过value、getAttribute和outerHTML获取input[type=file]的真实路径问题
					if (src.search(/\w:\\fakepath/) === 0){
						e.target.select();	
						src = document.selection.createRangeCollection()[0].htmlText;
					}
					var ext = src.substring(src.lastIndexOf('.') + 1);
					if (isExpectedMIME(MIME_EXT_MAP[ext])){
						previewEl.filters.item(_filter[1]).src = src;
					}
				}
				else{
					readAsDataURL(e.target.files[0]);
				}
			});
	};
	
	exports.Preview = Preview;
}(window));
