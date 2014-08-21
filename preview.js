/**
 * @author fsjohnuang
 * @version 0.2
 * @description 图片预览
 */
;(function(exports){
	var _filter = ['progid',
		'DXImageTransform.Microsoft.AlphaImageLoader',
		'(sizingMethod="scale")'];
	var useFilter = !!(document.body.filters && document.body.filters.item);
	var imgCls = 'data-preview-img';

	/*
	 * @param {HTMLFileElement} fileEl 文件上传元素
	 * @param {HTMLElement} previewEL 预览容器，建议使用div元素
	 */
	exports.Preview = function(fileEl, previewEl){
		if (!(this instanceof Preview)) return new Preview(fileEl, previewEl);

		var fr = null;
		// IE5.5~9
		if (useFilter){
			previewEl.style.filter = _filter[0] + ':' + _filter[1] + _filter[2];
		}
		else{
			fr = new FileReader();
			fr.addEventListener('load', function(e){
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

				img.src = e.target.result;
			});
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
					previewEl.filters.item(_filter[1]).src = src;
				}
				else{
					fr.readAsDataURL(e.target.files[0]);
				}
			});
	};
}(window));
