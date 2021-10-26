import util from 'util';

import { store } from '../store';

const { localStorage } = window;

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
		const { config: { settings: { livechat_enable_elastic_search_logs: enable, livechat_elastic_search_url: url, livechat_elastic_search_index: index } } } = store.state;
		if (!enable) {
			return;
		}
		await fetch(`${ url }/${ index }/_bulk`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: this.activeLogs,
		});
		this.clearLogs();
	}
}

const logger = new Logger('livechatWidget');
setInterval(() => {
	logger.sendLogsToES();
}, 60000);
export default logger;
