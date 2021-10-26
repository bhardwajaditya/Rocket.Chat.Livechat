import { route } from 'preact-router';

import { Livechat } from '../api';
import { setCookies, upsert, canRenderMessage } from '../components/helpers';
import { store } from '../store';
import { normalizeAgent } from './api';
import Commands from './commands';
import { handleIdleTimeout } from './idleTimeout';
import logger from './logger';
import { loadConfig, processUnread } from './main';
import { parentCall } from './parentCall';
import { normalizeMessage, normalizeMessages } from './threads';
import { handleTranscript } from './transcript';

const commands = new Commands();
export const CLOSE_CHAT = 'Close Chat';

export const onChatClose = async () => {
	await store.setState({ loading: true });
	await loadConfig();
	await store.setState({
		alerts: [],
		room: null,
		chatClosed: false,
		composerConfig: { disable: true, disableText: CLOSE_CHAT, onDisabledComposerClick: () => {} },
		minimized: true,
	});
	parentCall('minimizeWindow');
	route('/chat-finished');
	await store.setState({ loading: false });
};

export const closeChat = async ({ transcriptRequested } = {}) => {
	store.setState({ alerts: [] });
	logger.info('Closing chat');
	if (!transcriptRequested) {
		await handleTranscript();
	}
	parentCall('callback', 'chat-ended');
	store.setState({ composerConfig: {
		disable: true,
		disableText: CLOSE_CHAT,
		onDisabledComposerClick: onChatClose,
	},
	chatClosed: true,
	});
	logger.info('Composer disabled and chat closed');
	logger.sendLogsToES();
};

export const closeChatFromModal = async ({ transcriptRequested } = {}) => {
	logger.info('User closing chat from modal');
	store.setState({ alerts: [] });
	if (!transcriptRequested) {
		await handleTranscript();
	}
	parentCall('callback', 'chat-ended');
	onChatClose();
};


const disableComposer = (msg) => {
	const defaultText = 'Please Wait';
	const result = { disable: false, disableText: defaultText };

	if (!msg) {
		return result;
	}

	const { customFields = {}, attachments = [] } = msg;

	if (customFields.disableInput) {
		return { disable: true, disableText: customFields.disableInputMessage || defaultText };
	}

	for (let i = 0; i < attachments.length; i++) {
		const { actions = [] } = attachments[i];

		for (let j = 0; j < actions.length; j++) {
			const { disableInput, disableInputMessage } = actions[j];
			if (disableInput) {
				return { disable: true, disableText: disableInputMessage || defaultText };
			}
		}
	}

	return result;
};

const handleComposerOnMessage = async (message) => {
	const { composerConfig, chatClosed } = store.state;
	const { disable, disableText } = disableComposer(message);

	if (chatClosed || message.t === 'livechat-started' || message.t === 'livechat-close' || message.t === 'command') {
		return;
	}

	if (disable) {
		await store.setState({ composerConfig: { disable: true, disableText, onDisabledComposerClick: () => {} } });
	} else if (composerConfig && composerConfig.disableText !== CLOSE_CHAT) {
		await store.setState({ composerConfig: { disable: false, disableText: 'Please Wait', onDisabledComposerClick: () => {} } });
	}
};

const processMessage = async (message) => {
	if (message.t === 'livechat-close') {
		logger.info('Livechat close message received');
		closeChat(message);
		handleIdleTimeout({
			idleTimeoutAction: 'stop',
		});
	} else if (message.t === 'command') {
		commands[message.msg] && commands[message.msg]();
	}

	handleComposerOnMessage(message);
};

const doPlaySound = async (message) => {
	const { sound, user } = store.state;

	if (!sound.enabled || (user && message.u && message.u._id === user._id) || !message.msg) {
		return;
	}

	await store.setState({ sound: { ...sound, play: true } });
};

export const initRoom = async () => {
	logger.info('Room initialization request');
	const { state } = store;
	const { room } = state;

	if (!room) {
		logger.info('Existing room not found post initialization request');
		return;
	}

	Livechat.unsubscribeAll();

	const { token, agent, queueInfo, room: { _id: rid, servedBy } } = state;
	Livechat.subscribeRoom(rid);

	let roomAgent = agent;
	if (!roomAgent) {
		if (servedBy) {
			roomAgent = await Livechat.agent({ rid });
			await store.setState({ agent: roomAgent, queueInfo: null });
			parentCall('callback', ['assign-agent', normalizeAgent(roomAgent)]);
		}
	}

	if (queueInfo) {
		parentCall('callback', ['queue-position-change', queueInfo]);
	}

	Livechat.onAgentChange(rid, async (agent) => {
		await store.setState({ agent, queueInfo: null });
		parentCall('callback', ['assign-agent', normalizeAgent(agent)]);
	});

	Livechat.onAgentStatusChange(rid, (status) => {
		const { agent } = store.state;
		agent && store.setState({ agent: { ...agent, status } });
		parentCall('callback', ['agent-status-change', normalizeAgent(agent)]);
	});

	Livechat.onQueuePositionChange(rid, async (queueInfo) => {
		await store.setState({ queueInfo });
		parentCall('callback', ['queue-position-change', queueInfo]);
	});

	setCookies(rid, token);
};

const isAgentHidden = () => {
	const { config: { settings: { agentHiddenInfo } = {} } = {} } = store.state;

	return !!agentHiddenInfo;
};

const transformAgentInformationOnMessage = (message) => {
	const { user } = store.state;
	if (message.u && message.u._id !== user._id && isAgentHidden()) {
		return { ...message, u: { _id: message.u._id } };
	}

	return message;
};

Livechat.onTyping((username, isTyping) => {
	const { typing, user, agent } = store.state;

	if (user && user.username && user.username === username) {
		return;
	}

	if (agent && agent.hiddenInfo) {
		return;
	}

	if (typing.indexOf(username) === -1 && isTyping) {
		typing.push(username);
		return store.setState({ typing });
	}

	if (!isTyping) {
		return store.setState({ typing: typing.filter((u) => u !== username) });
	}
});

Livechat.onMessage(async (message) => {
	if (message.ts instanceof Date) {
		message.ts = message.ts.toISOString();
	}

	message = await normalizeMessage(message);
	if (!message) {
		return;
	}

	message = transformAgentInformationOnMessage(message);

	await store.setState({
		messages: upsert(store.state.messages, message, ({ _id }) => _id === message._id, ({ ts }) => ts),
	});

	// Viasat : Timeout Warnings
	if (message.customFields && message.customFields.idleTimeoutConfig) {
		handleIdleTimeout(message.customFields.idleTimeoutConfig);
	} else {
		handleIdleTimeout({
			idleTimeoutAction: 'stop',
		});
	}

	if (message.customFields) {
		if (message.customFields.sneakPeekEnabled !== undefined || message.customFields.sneakPeekEnabled !== null) {
			store.setState({ sneakPeekEnabled: message.customFields.sneakPeekEnabled });
		}
		if (message.customFields.salesforceAgentName) {
			store.state.agent.name = message.customFields.salesforceAgentName;
		}
	}

	await processMessage(message);

	if (canRenderMessage(message) !== true) {
		return;
	}

	if (message.editedAt) {
		return;
	}

	await processUnread();
	await doPlaySound(message);
});

export const getGreetingMessages = (messages) => messages && messages.filter((msg) => msg.trigger);

export const loadMessages = async () => {
	const { room: { _id: rid } = {} } = store.state;

	if (!rid) {
		return;
	}

	await store.setState({ loading: true });
	let rawMessages = await Livechat.loadMessages(rid);
	rawMessages = rawMessages?.reverse();
	const { messages: storedMessages } = store.state;
	(storedMessages || []).forEach((message) => {
		rawMessages = upsert(rawMessages, message, ({ _id }) => _id === message._id, ({ ts }) => ts);
	});
	const messages = (await normalizeMessages(rawMessages)).map(transformAgentInformationOnMessage).map((message) => {
		const oldMessage = storedMessages.find((x) => x._id === message._id);
		if (oldMessage && oldMessage.actionsVisible !== undefined) {
			message.actionsVisible = oldMessage.actionsVisible;
		}
		handleComposerOnMessage(message);
		return message;
	});

	await initRoom();
	await store.setState({ messages: (messages || []).sort((a, b) => new Date(a.ts) - new Date(b.ts)), noMoreMessages: false, loading: false });

	if (messages && messages.length) {
		const lastMessage = messages[messages.length - 1];
		await store.setState({ lastReadMessageId: lastMessage && lastMessage._id });

		const { disable, disableText } = disableComposer(lastMessage);

		if (disable) {
			store.setState({ composerConfig: { disable: true, disableText, onDisabledComposerClick: () => {} } });
		}
	}

	const { idleTimeout } = store.state;

	if (idleTimeout && idleTimeout.idleTimeoutRunning) {
		const {
			idleTimeoutMessage,
			idleTimeoutWarningTime,
			idleTimeoutTimeoutTime,
		} = idleTimeout;
		handleIdleTimeout({
			idleTimeoutAction: 'start',
			idleTimeoutMessage,
			idleTimeoutWarningTime,
			idleTimeoutTimeoutTime,
		});
	}
};

export const loadMoreMessages = async () => {
	const { room: { _id: rid } = {}, messages = [], noMoreMessages = false } = store.state;

	if (!rid || noMoreMessages) {
		return;
	}

	await store.setState({ loading: true });

	let rawMessages = await Livechat.loadMessages(rid, { limit: messages.length + 10 });
	rawMessages = rawMessages?.reverse();
	const moreMessages = (await normalizeMessages(rawMessages)).map(transformAgentInformationOnMessage).map((message) => {
		const { _id } = message;
		const oldMessage = messages.find((x) => x._id === _id);
		if (oldMessage && oldMessage.actionsVisible !== undefined) {
			message.actionsVisible = oldMessage.actionsVisible;
		}
		handleComposerOnMessage(message);
		return message;
	});

	await store.setState({
		messages: moreMessages || [],
		noMoreMessages: messages.length + 10 > moreMessages.length,
		loading: false,
	});
};

export const defaultRoomParams = () => {
	const params = {};

	const { defaultAgent: agent = {} } = store.state;
	if (agent && agent._id) {
		Object.assign(params, { agentId: agent._id });
	}

	return params;
};

export const assignRoom = async () => {
	logger.info('Room assign request initiated');
	const { room } = store.state;

	if (room) {
		return;
	}

	const params = defaultRoomParams();
	const newRoom = await Livechat.room(params);
	await store.setState({ room: newRoom });
	await initRoom();
};

store.on('change', ([state, prevState]) => {
	// Cross-tab communication
	// Detects when a room is created and then route to the correct container
	if (!prevState.room && state.room) {
		route('/');
	}
});
