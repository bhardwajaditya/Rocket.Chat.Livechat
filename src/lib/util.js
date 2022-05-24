export const isMobile = () => {
	let hasTouchScreen = false;
	if ('maxTouchPoints' in navigator) {
		hasTouchScreen = navigator.maxTouchPoints > 0;
	} else if ('msMaxTouchPoints' in navigator) {
		hasTouchScreen = navigator.msMaxTouchPoints > 0;
	} else {
		const mQ = window.matchMedia && matchMedia('(pointer:coarse)');
		if (mQ && mQ.media === '(pointer:coarse)') {
			hasTouchScreen = !!mQ.matches;
		} else if ('orientation' in window) {
			hasTouchScreen = true;
		} else {
			const UA = navigator.userAgent;
			hasTouchScreen = /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA)
              || /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
		}
	}
	return hasTouchScreen;
};

export const isWebView = () => {
	const webViewRegexList = [
		// if it says it's a webview, let's go with that
		'WebView',
		// iOS webview will be the same as safari but missing "Safari"
		'(iPhone|iPod|iPad)(?!.*Safari)',
		// Android Lollipop and Above: webview will be the same as native but it will contain "wv"
		// Android KitKat to lollipop webview will put {version}.0.0.0
		'Android.*(wv|.0.0.0)',
		// old chrome android webview agent
		'Linux; U; Android',
	];
	return !!navigator.userAgent.match(new RegExp(`(${ webViewRegexList.join('|') })`, 'ig'));
};
