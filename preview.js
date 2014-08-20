/**
 * @author fsjohnuang
 * @version 0.1
 * @description 图片预览
 * @caution 在IE11下且文档模式小于10时，预览功能将失效。
 * 因为出于安全考虑，IE11的file元素的value值被替换c:\fakepath\文件名,因此在使用滤镜时由于无法获取真实路径导致图片加载失败。
 */
;(function(exports){
	var _filter = ['progid',
		'DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod="scale")'];
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
			previewEl.style.filter += ';' + _filter[0] + ':' + _filter[1];
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
		var evtPrefix = '';
		(fileEl.addEventListener || (evtPrefix = 'on') && fileEl.attachEvent)(evtPrefix + 'change', function(e){
				e = e || window.event;
				if (useFilter){
					previewEl.filters.item(_filter[1]).src = e.target.value;
				}
				else{
					fr.readAsDataURL(e.target.files[0]);
				}
			});
	};
}(window));
