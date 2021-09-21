import { Livechat } from '../api';
import store from '../store';

class CustomFields {
	constructor() {
		if (!CustomFields.instance) {
			this._initiated = false;
			this._started = false;
			this._queue = {};
			this._callback = () => { };
			CustomFields.instance = this;
		}

		return CustomFields.instance;
	}

	init() {
		if (this._initiated) {
			return;
		}

		this._initiated = true;
		const { token } = store.state;
		Livechat.credentials.token = token;

		store.on('change', this.handleStoreChange);
	}

	reset() {
		this._initiated = false;
		this._started = false;
		this._queue = {};
		this._callback = () => { };
		store.off('change', this.handleStoreChange);
	}

	async handleStoreChange([state]) {
		const { user } = state;
		const { _started } = CustomFields.instance;

		if (_started) {
			return;
		}

		if (!user) {
			return;
		}

		CustomFields.instance._started = true;
		await CustomFields.instance.processCustomFields();
	}

	async processCustomFields() {
		Object.keys(this._queue).forEach(async (key, index, array) => {
			const { value, overwrite } = this._queue[key];
			await this.setCustomField(key, value, overwrite);
			if (index === array.length - 1) {
				CustomFields.instance._callback();
			}
		});

		this._queue = {};
	}

	async setCustomField(key, value, overwrite = true) {
		if (!this._started) {
			this._queue[key] = { value, overwrite };
			return;
		}

		const { token } = Livechat.credentials;
		await Livechat.sendCustomField({ token, key, value, overwrite });
	}

	setOnCustomFieldsUpdated(callback) {
		this._callback = callback || (() => { });
	}
}

const instance = new CustomFields();
export default instance;
