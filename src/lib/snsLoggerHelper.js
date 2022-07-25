import { store } from '../store';

const { sessionStorage } = window;
export const generateLoggerPayload = (category, action, properties, event_type) => {
	const { room: { _id: rid } = {} } = store.state;
	const loggerPayload = {
		room_id: rid,
		category,
		action,
		properties: { ...properties },
		event_type,
		timestamp: new Date(),
		tab_id: sessionStorage.getItem('sessionId'),
	};
	return loggerPayload;
};
