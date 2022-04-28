import { Livechat } from '../api';
import store from '../store';


const promptTranscript = async () => {
	const { user: { token, visitorEmails }, room: { _id } } = store.state;
	const email = visitorEmails && visitorEmails.length > 0 ? visitorEmails[0].address : '';

	const transcript = await Livechat.requestTranscript(email, { token, rid: _id });
	return transcript;
};

export const handleTranscript = async () => {
	const { config: { settings: { transcript } = {} } } = store.state;

	if (!transcript) {
		return;
	}

	const result = await promptTranscript();
	if (result && result.success) {
		const element = document.createElement('a');
		const file = new Blob([result.transcript], { type: 'text/plain' });
		element.href = URL.createObjectURL(file);
		element.download = 'transcript.txt';
		document.body.appendChild(element);
		element.click();
	}
};
