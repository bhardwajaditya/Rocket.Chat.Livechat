import { h, Component } from 'preact';
import { route } from 'preact-router';

import { Livechat } from '../../api';
import { ModalManager } from '../../components/Modal';
import { debounce, getAvatarUrl, getFilteredMsg, canRenderMessage, throttle, upsert, parse } from '../../components/helpers';
import I18n from '../../i18n';
import { normalizeQueueAlert } from '../../lib/api';
import constants from '../../lib/constants';
import logger from '../../lib/logger';
import { loadConfig } from '../../lib/main';
import { parentCall, runCallbackEventEmitter } from '../../lib/parentCall';
import { createToken } from '../../lib/random';
import { initRoom, loadMessages, loadMoreMessages, defaultRoomParams, getGreetingMessages, onChatClose, reloadMessages, CLOSE_CHAT } from '../../lib/room';
import triggers from '../../lib/triggers';
import store, { Consumer } from '../../store';
import Chat from './component';

export class ChatContainer extends Component {
	state = {
		room: null,
		connectingAgent: false,
		queueSpot: 0,
		triggerQueueMessage: true,
		estimatedWaitTime: null,
	}

	checkConnectingAgent = async () => {
		const { connecting, queueInfo } = this.props;
		const { connectingAgent, queueSpot, estimatedWaitTime } = this.state;

		const newConnecting = connecting;
		const newQueueSpot = (queueInfo && queueInfo.spot) || 0;
		const newEstimatedWaitTime = queueInfo && queueInfo.estimatedWaitTimeSeconds;

		if (newConnecting !== connectingAgent || newQueueSpot !== queueSpot || newEstimatedWaitTime !== estimatedWaitTime) {
			this.state.connectingAgent = newConnecting;
			this.state.queueSpot = newQueueSpot;
			this.state.estimatedWaitTime = newEstimatedWaitTime;
			await this.handleQueueMessage(connecting, queueInfo);
			await this.handleConnectingAgentAlert(newConnecting, normalizeQueueAlert(queueInfo));
		}
	}

	checkRoom = () => {
		const { room } = this.props;
		const { room: stateRoom } = this.state;
		if (room && (!stateRoom || room._id !== stateRoom._id)) {
			logger.info(`Different room found: Old Room ${ stateRoom && stateRoom._id }, New Room ${ room._id }`);
			this.state.room = room;
			setTimeout(reloadMessages, 500);
		}
	}

	grantUser = async () => {
		const { token, user, guest, dispatch } = this.props;

		if (user) {
			return user;
		}

		const visitor = { token, ...guest };
		const newUser = await Livechat.grantVisitor({ visitor });
		await dispatch({ user: newUser });
	}

	getRoom = async () => {
		logger.info('Get room called from the container code');
		const { alerts, dispatch, room, messages } = this.props;
		const { dropTriggerMessage, config: { settings: { livechat_chat_already_closed_message: livechatClosedMessage } } } = store.state;
		const previousMessages = getGreetingMessages(messages);

		if (room) {
			logger.info('Exisiting room found returning it');
			return room;
		}
		if (dropTriggerMessage) {
			await dispatch({ composerConfig: { disable: true, disableText: livechatClosedMessage } });
			return;
		}
		logger.info('Disabling composer');
		await dispatch({ loading: true });
		await dispatch({ composerConfig: { disable: true, disableText: 'Starting chat...' } });
		logger.info('Room not found on user input, sending a new room creation request');
		try {
			const params = defaultRoomParams();
			const newRoom = await Livechat.room(params);
			await dispatch({ room: newRoom, messages: previousMessages, noMoreMessages: false });
			await initRoom();

			parentCall('callback', 'chat-started');
			return newRoom;
		} catch (error) {
			const { data: { error: reason } } = error;
			const alert = { id: createToken(), children: I18n.t('Error starting a new conversation: %{reason}', { reason }), error: true, timeout: 10000 };
			await dispatch({ loading: false, alerts: (alerts.push(alert), alerts) });

			runCallbackEventEmitter(reason);
			throw error;
		} finally {
			await dispatch({ loading: false, composerConfig: { disable: false } });
		}
	}

	handleTop = () => {
		loadMoreMessages();
	}

	startTyping = throttle(async ({ rid, username, text }) => {
		await Livechat.notifyVisitorTyping(rid, username, true, text);
		this.stopTypingDebounced({ rid, username });
	}, 4500)

	stopTyping = ({ rid, username }) => Livechat.notifyVisitorTyping(rid, username, false)

	stopTypingDebounced = debounce(this.stopTyping, 5000)

	handleSneakPeakDebounced = debounce(async ({ rid, username, text }) => {
		await Livechat.notifyVisitorTyping(rid, username, true, text);
	}, 2000)

	handleChangeText = async (text) => {
		const { user, room } = this.props;
		if (!(user && user.username && room && room._id)) {
			return;
		}
		const { sneakPeekEnabled } = store.state;
		sneakPeekEnabled && this.handleSneakPeakDebounced({ rid: room._id, username: user.username, text });
		this.startTyping(sneakPeekEnabled ? { rid: room._id, username: user.username, text } : { rid: room._id, username: user.username });
	}

	resetLastAction = () => {
		// makes all actions button invisible
		const { messages, dispatch } = this.props;

		const newMessages = messages.map((message) => {
			if (message.actionsVisible) {
				message.actionsVisible = false;
			}
			return message;
		});
		dispatch({ messages: newMessages });
	}

	getAvatar = (username, isVisitor = false, name = null) => {
		if (!isVisitor || name) {
			return getAvatarUrl(name || username);
		}

		const { defaultAvatar } = this.props;
		return `${ Livechat.client.host }/${ defaultAvatar.url || defaultAvatar.defaultUrl }`;
	}

	handleSubmit = async (msg) => {
		if (msg.trim() === '') {
			return;
		}

		msg = parse(msg);

		await this.grantUser();
		const { _id: rid } = await this.getRoom();
		const { alerts, dispatch, token, user } = this.props;
		const avatar = this.getAvatar(user.username, true, user.name);

		try {
			this.stopTypingDebounced.stop();
			this.handleSneakPeakDebounced.stop();
			this.resetLastAction();
			await Promise.all([
				this.stopTyping({ rid, username: user.username }),
				Livechat.sendMessage({ msg: getFilteredMsg(msg), token, rid, avatar }),
			]);
		} catch (error) {
			const reason = error?.data?.error ?? error.message;
			const alert = { id: createToken(), children: reason, error: true, timeout: 5000 };
			await dispatch({ alerts: (alerts.push(alert), alerts) });
		}
		await Livechat.notifyVisitorTyping(rid, user.username, false);
	}

	doFileUpload = async (rid, file) => {
		const { alerts, dispatch } = this.props;

		try {
			await Livechat.uploadFile({ rid, file });
		} catch (error) {
			const { data: { reason, sizeAllowed } } = error;

			let message = I18n.t('FileUpload Error');
			switch (reason) {
				case 'error-type-not-allowed':
					message = I18n.t('Media Types Not Accepted.');
					break;
				case 'error-size-not-allowed':
					message = I18n.t('File exceeds allowed size of %{size}.', { size: sizeAllowed });
			}

			const alert = { id: createToken(), children: message, error: true, timeout: 5000 };
			await dispatch({ alerts: (alerts.push(alert), alerts) });
		}
	};

	handleUpload = async (files) => {
		await this.grantUser();
		const { _id: rid } = await this.getRoom();

		files.forEach((file) => this.doFileUpload(rid, file));
	}

	handleSoundStop = async () => {
		const { dispatch, sound = {} } = this.props;
		await dispatch({ sound: { ...sound, play: false } });
	}

	onChangeDepartment = () => {
		route('/switch-department');
	}

	onFinishChat = async () => {
		logger.info('User closing chat from modal');
		const { composerConfig, room: { _id: rid } = {} } = this.props;

		if (composerConfig && composerConfig.disableText === CLOSE_CHAT) {
			onChatClose();
			return;
		}

		const { success } = await ModalManager.confirm({
			text: I18n.t(this.props.livechat_close_modal_message),
		});

		if (!success) {
			return;
		}

		const { alerts, dispatch } = this.props;

		const loggerPayload = {
			room_id: rid,
			category: 'Chat Session',
			action: 'closed',
			properties: {
				close_method: 'chat window',
			},
			event_type: 'customer_action',
			timestamp: new Date(),
		};
		Livechat.sendLogsToSNS(loggerPayload);

		await dispatch({ loading: true });
		try {
			if (rid) {
				await Livechat.closeChat({ rid });
			}
		} catch (error) {
			console.error(error);
			const alert = { id: createToken(), children: I18n.t('Error closing chat.'), error: true, timeout: 0 };
			await dispatch({ alerts: (alerts.push(alert), alerts) });
		} finally {
			await dispatch({ loading: false });
		}
	}

	onRemoveUserData = async () => {
		const { success } = await ModalManager.confirm({
			text: I18n.t('Are you sure you want to remove all of your personal data?'),
		});

		if (!success) {
			return;
		}

		const { alerts, dispatch } = this.props;

		await dispatch({ loading: true });
		try {
			await Livechat.deleteVisitor();
		} catch (error) {
			console.error(error);
			const alert = { id: createToken(), children: I18n.t('Error removing user data.'), error: true, timeout: 0 };
			await dispatch({ alerts: (alerts.push(alert), alerts) });
		} finally {
			await loadConfig();
			await dispatch({ loading: false });
			route('/chat-finished');
		}
	}

	onPrintTranscript = () => {
		const printContent = document.getElementById('chat__messages').innerHTML;
		const head = document.getElementsByTagName('head')[0].innerHTML;
		const printWindow = window.open();
		printWindow.document.write(printContent);
		printWindow.document.head.innerHTML = head;
		printWindow.document.body.setAttribute('onload', 'window.print()');
		printWindow.document.close();
	}

	canSwitchDepartment = () => {
		const { allowSwitchingDepartments, departments = {} } = this.props;
		return allowSwitchingDepartments && departments.filter((dept) => dept.showOnRegistration).length > 1;
	}

	canFinishChat = () => {
		const { room, connecting } = this.props;
		return (room !== undefined) || connecting;
	}

	canRemoveUserData = () => {
		const { allowRemoveUserData } = this.props;
		return allowRemoveUserData;
	}

	registrationRequired = () => {
		const {
			registrationFormEnabled,
			nameFieldRegistrationForm,
			emailFieldRegistrationForm,
			departments = [],
			user,
		} = this.props;

		if (user && user.token) {
			return false;
		}

		if (!registrationFormEnabled) {
			return false;
		}

		const showDepartment = departments.filter((dept) => dept.showOnRegistration).length > 0;
		return nameFieldRegistrationForm || emailFieldRegistrationForm || showDepartment;
	}

	onRegisterUser = () => route('/register');

	canPrintTranscript = () => {
		const { printTranscript } = this.props;
		return printTranscript;
	}

	showOptionsMenu = () =>
		this.canSwitchDepartment() || this.canPrintTranscript() || this.canRemoveUserData()


	async handleConnectingAgentAlert(connecting, message) {
		const { alerts: oldAlerts, dispatch } = this.props;
		const { connectingAgentAlertId } = constants;
		const alerts = oldAlerts.filter((item) => item.id !== connectingAgentAlertId);
		if (connecting) {
			alerts.push({
				id: connectingAgentAlertId,
				children: message || I18n.t('Please, wait for the next available agent..'),
				warning: true,
				hideCloseButton: true,
				timeout: 0,
			});
		}

		await dispatch({ alerts });
	}

	async handleQueueMessage(connecting, queueInfo) {
		if (!queueInfo) {
			return;
		}

		const { livechatQueueMessageId } = constants;
		const { message: { text: msg, user: u } = {} } = queueInfo;
		const { triggerQueueMessage } = this.state;

		const { room } = this.props;
		if (!room || !connecting || !msg || !triggerQueueMessage) {
			return;
		}

		this.state.triggerQueueMessage = false;

		const { dispatch, messages } = this.props;
		const ts = new Date();
		const message = { _id: livechatQueueMessageId, msg, u, ts: ts.toISOString() };
		await dispatch({
			messages: upsert(messages, message, ({ _id }) => _id === message._id, ({ ts }) => ts),
		});
	}

	async handleClosedRoom() {
		const { chatClosed } = store.state;
		if (chatClosed) {
			await onChatClose();
		}
	}

	async componentDidMount() {
		await this.checkConnectingAgent();
		await this.handleClosedRoom();
		loadMessages();
	}

	async componentDidUpdate(prevProps) {
		const { messages, visible, minimized, dispatch, room, route, composerConfig, chatClosed } = this.props;
		const { messages: prevMessages, alerts: prevAlerts } = prevProps;

		if (messages && prevMessages && messages.length !== prevMessages.length && visible && !minimized) {
			const nextLastMessage = messages[messages.length - 1];
			const lastMessage = prevMessages[prevMessages.length - 1];
			if ((nextLastMessage && lastMessage && nextLastMessage._id !== lastMessage._id) || (messages.length === 1 && prevMessages.length === 0)) {
				const newAlerts = prevAlerts.filter((item) => item.id !== constants.unreadMessagesAlertId);
				dispatch({ alerts: newAlerts, unread: null, lastReadMessageId: nextLastMessage._id });
			}
		} else if (!room && visible && !minimized) {
			if (prevProps.minimized) {
				// Trigger Chat Opened when user starts chat by clicking icon
				triggers.processChatOpened();
			} else if (prevProps.route !== route && route === '/') {
				// Trigger Chat Opened when user goes to chat by registering or new chat
				triggers.processChatOpened();
			}
		}

		if (!chatClosed && composerConfig && composerConfig.disableText === CLOSE_CHAT && minimized && messages.length > 0) {
			await dispatch({ messages: [], alerts: [], unread: null, lastReadMessageId: null, visible: true });
			await loadConfig();
		}

		await this.checkConnectingAgent();
		this.checkRoom();
	}

	componentWillUnmount() {
		this.handleConnectingAgentAlert(false);
	}

	render = ({ user, ...props }) => (
		<Chat
			{...props}
			avatarResolver={this.getAvatar}
			uid={user && user._id}
			onTop={this.handleTop}
			onChangeText={this.handleChangeText}
			onSubmit={this.handleSubmit}
			onUpload={this.handleUpload}
			options={this.showOptionsMenu()}
			onChangeDepartment={(this.canSwitchDepartment() && this.onChangeDepartment) || null}
			onFinishChat={(this.canFinishChat() && this.onFinishChat) || null}
			onRemoveUserData={(this.canRemoveUserData() && this.onRemoveUserData) || null}
			onPrintTranscript={(this.canPrintTranscript() && this.onPrintTranscript) || null}
			onSoundStop={this.handleSoundStop}
			registrationRequired={this.registrationRequired()}
			onRegisterUser={this.onRegisterUser}
			resetLastAction={this.resetLastAction}
			composerConfig={props.composerConfig}
			postChatUrl={props.postChatUrl}
			chatClosed={props.chatClosed}
			livechat_kill_switch={props.livechat_kill_switch}
			livechat_kill_switch_message={props.livechat_kill_switch_message}
			livechat_close_modal_message={props.Livechat_close_modal_message}
			enableTranscriptMobile = {props.enableTranscriptMobile}
		/>
	)
}


export const ChatConnector = ({ ref, ...props }) => (
	<Consumer>
		{({
			config: {
				settings: {
					fileUpload: uploads,
					guestDefaultAvatar: defaultAvatar,
					allowSwitchingDepartments,
					forceAcceptDataProcessingConsent: allowRemoveUserData,
					showConnecting,
					registrationForm,
					nameFieldRegistrationForm,
					emailFieldRegistrationForm,
					transcript,
					printTranscript,
					limitTextLength,
					livechat_kill_switch,
					livechat_kill_switch_message,
					livechat_close_modal_message,
					enableTranscriptMobile,
				} = {},
				messages: {
					conversationFinishedText,
				} = {},
				theme: {
					color,
					title,
				} = {},
				departments = {},
			},
			iframe: {
				theme: {
					color: customColor,
					fontColor: customFontColor,
					iconColor: customIconColor,
					title: customTitle,
				} = {},
				guest,
			} = {},
			token,
			agent,
			sound,
			user,
			room,
			messages,
			noMoreMessages,
			typing,
			loading,
			dispatch,
			alerts,
			composerConfig,
			postChatUrl,
			chatClosed,
			visible,
			unread,
			lastReadMessageId,
			triggerAgent,
			queueInfo,
			incomingCallAlert,
			ongoingCall,
			route,
		}) => (
			<ChatContainer
				ref={ref}
				{...props}
				theme={{
					color: customColor || color,
					fontColor: customFontColor,
					iconColor: customIconColor,
					title: customTitle,
				}}
				title={!livechat_kill_switch ? customTitle || title || I18n.t('Need help?') : livechat_kill_switch_message}
				sound={sound}
				token={token}
				user={user}
				agent={agent && !livechat_kill_switch ? {
					_id: agent._id,
					name: agent.name,
					status: agent.status,
					email: agent.emails && agent.emails[0] && agent.emails[0].address,
					username: agent.username,
					phone: (agent.phone && agent.phone[0] && agent.phone[0].phoneNumber) || (agent.customFields && agent.customFields.phone),
					avatar: agent.username ? {
						description: agent.username,
						src: getAvatarUrl((agent.alias && agent.name) || agent.username),
					} : undefined,
				} : undefined}
				room={room}
				messages={messages && messages.filter((message) => canRenderMessage(message))}
				noMoreMessages={noMoreMessages}
				emoji={true}
				uploads={uploads}
				typingUsernames={Array.isArray(typing) ? typing : []}
				loading={loading}
				showConnecting={showConnecting} // setting from server that tells if app needs to show "connecting" sometimes
				connecting={!!(room && !agent && (showConnecting || queueInfo))}
				dispatch={dispatch}
				departments={departments}
				defaultAvatar={defaultAvatar}
				allowSwitchingDepartments={allowSwitchingDepartments}
				conversationFinishedText={conversationFinishedText || I18n.t('Chat finished')}
				allowRemoveUserData={allowRemoveUserData}
				transcript={transcript}
				printTranscript={printTranscript}
				alerts={alerts}
				visible={visible}
				unread={unread}
				lastReadMessageId={lastReadMessageId}
				guest={guest}
				triggerAgent={triggerAgent}
				queueInfo={queueInfo ? {
					spot: queueInfo.spot,
					estimatedWaitTimeSeconds: queueInfo.estimatedWaitTimeSeconds,
					message: queueInfo.message,
				} : undefined}
				registrationFormEnabled={registrationForm}
				nameFieldRegistrationForm={nameFieldRegistrationForm}
				emailFieldRegistrationForm={emailFieldRegistrationForm}
				limitTextLength={limitTextLength}
				incomingCallAlert={incomingCallAlert}
				ongoingCall={ongoingCall}
				composerConfig={composerConfig}
				postChatUrl={postChatUrl}
				chatClosed={chatClosed}
				livechat_kill_switch={livechat_kill_switch}
				livechat_kill_switch_message={livechat_kill_switch_message}
				livechat_close_modal_message={livechat_close_modal_message}
				enableTranscriptMobile = {enableTranscriptMobile}
				route={route}
			/>
		)}
	</Consumer>
);


export default ChatConnector;
