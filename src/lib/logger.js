import util from 'util';

import { store } from '../store';

const isMobile = () => {
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

const urlDecomposition = (url) => {
	let tempUrl = url.split('://');
	if (tempUrl.length < 2) {
		throw new Error('URL is not valid.');
	}
	const protocol = tempUrl[0];
	tempUrl = tempUrl.slice(1).join('://');
	tempUrl = tempUrl.split('/');
	const host = tempUrl[0];
	const path = `/${ tempUrl.slice(1).join('/') }`;
	tempUrl = path.split('?');
	const pathname = tempUrl[0];
	const query = tempUrl.slice(1).join('?');

	return { protocol, host, path, pathname, query };
};
class Logger {
	constructor(name, key = 'logs') {
		if (isMobile()) {
			return;
		}
		const { localStorage } = window;
		this.localStorage = localStorage;
		this.name = name;
		this.localStorageKey = key;
		this.activeLogs = this.localStorage.getItem(this.localStorageKey) || '';
		this.localStorage.setItem(this.localStorageKey, this.activeLogs);
	}

	info(...input) {
		if (isMobile()) {
			return;
		}
		const message = util.format.apply(util, input);
		const { room, token } = store.state;
		const newLog = {
			'@timestamp': new Date().toISOString(),
			room_id: room?._id,
			userToken: token,
			message,
		};
		this.appendLog(`{ "index": {} }\n${ JSON.stringify(newLog) }\n`);
	}

	appendLog(newLog) {
		this.activeLogs += newLog;
		this.localStorage.setItem(this.localStorageKey, this.activeLogs);
	}

	clearLogs() {
		this.activeLogs = [];
		this.localStorage.setItem(this.localStorageKey, []);
	}

	async sendLogsToES() {
		if (isMobile()) {
			return;
		}
		const aws4 = require('aws4');
		const { config: { settings: {
			livechat_enable_elastic_search_logs: enable,
			livechat_elastic_search_url: url,
			livechat_elastic_search_index: index,
			livechat_elastic_search_access_key: access_key,
			livechat_elastic_search_access_key_secret: secret_access_key,
		} } } = store.state;
		if (!enable) {
			this.clearLogs();
			return;
		}

		const uri = `${ url }/${ index }/_bulk`;
		const { host, pathname } = urlDecomposition(uri);
		const region = 'us-east-1';
		const service = 'es';
		const content_type = 'application/json';

		const opts = {
			method: 'POST',
			host,
			path: pathname,
			region,
			service,
			headers: {
				'Content-Type': content_type,
			},
			body: this.activeLogs,
		};

		aws4.sign(opts, {
			secretAccessKey: secret_access_key,
			accessKeyId: access_key,
		});

		await fetch(uri, opts)
			.then((response) => console.log(response))
			.catch((error) => console.log(error));
		this.clearLogs();
	}
}

const logger = new Logger('livechatWidget');
setInterval(() => {
	logger.sendLogsToES();
}, 60000);
export default logger;
