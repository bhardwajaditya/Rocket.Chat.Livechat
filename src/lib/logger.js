import util from 'util';

import { store } from '../store';

const { localStorage } = window;

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
		this.name = name;
		this.localStorageKey = key;
		this.activeLogs = localStorage.getItem(localStorage) || '';
		localStorage.setItem(this.localStorageKey, this.activeLogs);
	}

	info(...input) {
		const message = util.format.apply(util, input);
		const { room, token } = store.state;
		const newLog = {
			_timestamp: new Date().toISOString(),
			room_id: room?._id,
			userToken: token,
			message,
		};
		this.appendLog(`{ "index": {} }\n${ JSON.stringify(newLog) }\n`);
	}

	appendLog(newLog) {
		this.activeLogs += newLog;
		localStorage.setItem(this.localStorageKey, this.activeLogs);
	}

	clearLogs() {
		this.activeLogs = [];
		localStorage.setItem(this.localStorageKey, []);
	}

	async sendLogsToES() {
		const aws4 = require('aws4');
		const { config: { settings: {
			livechat_enable_elastic_search_logs: enable,
			livechat_elastic_search_url: url,
			livechat_elastic_search_index: index,
			livechat_elastic_search_access_key: access_key,
			livechat_elastic_search_access_key_secret: secret_access_key,
		} } } = store.state;
		if (!enable) {
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
