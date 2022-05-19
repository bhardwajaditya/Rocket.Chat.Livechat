import { Livechat } from '../api';
import store from '../store';
import { parentCall } from './parentCall';
import { isWebView } from './util';

const promptTranscript = async () => {
	const { user: { token, visitorEmails }, room: { _id } } = store.state;
	const email = visitorEmails && visitorEmails.length > 0 ? visitorEmails[0].address : '';

	const transcript = await Livechat.requestTranscript(email, { token, rid: _id });
	return transcript;
};

const base64toBlob = (data) => {
	const base64WithoutPrefix = data.replace(/^data:\w+\/[-+.\w]+;base64,/, '');
	const bytes = atob(base64WithoutPrefix);
	let { length } = bytes;
	const out = new Uint8Array(length);

	while (length--) {
		out[length] = bytes.charCodeAt(length);
	}

	return new Blob([out], { type: 'application/pdf' });
};

export const handleTranscript = async () => {
	const { config: { settings: { transcript } = {} } } = store.state;

	if (!transcript) {
		return;
	}

	const result = await promptTranscript();
	const base64Data = result?.transcript;
	const fileName = `Viasat-Customer-Support_Transcript-${ Date.now().toString() }.pdf`;

	if (result && result.success) {
		if (isWebView()) {
			const data = JSON.stringify({ eventType: 'transcript', data: { value: base64Data, name: fileName } });
			if (window.ReactNativeWebView) {
				window.ReactNativeWebView.postMessage(data);
			} else {
				parentCall('postMessage', data);
			}
		} else {
			const file = base64toBlob(base64Data);
			const url = URL.createObjectURL(file);

			// Start File Download
			const element = document.createElement('a');
			element.href = url;
			element.download = fileName;
			document.body.appendChild(element);
			element.click();

			// Open File
			window.open(url);
		}
	}
};
