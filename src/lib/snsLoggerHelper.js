import { store } from '../store';

const { sessionStorage } = window;
export const generateLoggerPayload = (category, action, properties, eventType) => {
	const { room: { _id: rid } = {} } = store.state;
	const loggerPayload = {
		roomId: rid,
		category,
		action,
		properties: { ...properties },
		eventType,
		timestamp: new Date(),
		tabId: sessionStorage.getItem('sessionId'),
	};
	return loggerPayload;
};
