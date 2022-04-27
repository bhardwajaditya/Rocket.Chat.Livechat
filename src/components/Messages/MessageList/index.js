import { parseISO } from 'date-fns/fp';
import isSameDay from 'date-fns/isSameDay';
import { h } from 'preact';

import constants from '../../../lib/constants';
import store from '../../../store';
import { isCallOngoing } from '../../Calls/CallStatus';
import { JoinCallButton } from '../../Calls/JoinCallButton';
import { createClassName, getAttachmentUrl, MemoizedComponent } from '../../helpers';
import { Message } from '../Message';
import { MessageSeparator } from '../MessageSeparator';
import { TypingIndicator } from '../TypingIndicator';
import { isMyMessage, msgSequence } from './msgSequenceHelper';
import styles from './styles.scss';

const isNotEmpty = (message) => message && (message.t || message.msg || message.blocks || message.attachments);

const shouldHideMessage = (message) => {
	const { config: { settings: { hideSysMessages } } } = store.state;
	if (!message.t) {
		return false;
	}
	if (hideSysMessages === [] || !hideSysMessages) {
		return false;
	}
	if (hideSysMessages.indexOf(message.t) !== -1) {
		return true;
	}
	return false;
};

export class MessageList extends MemoizedComponent {
	static defaultProps = {
		typingUsernames: [],
	}

	static SCROLL_AT_TOP = 'top';

	static SCROLL_AT_BOTTOM = 'bottom';

	static SCROLL_FREE = 'free';

	scrollPosition = MessageList.SCROLL_AT_BOTTOM

	handleScroll = () => {
		if (this.isResizingFromBottom) {
			this.base.scrollTop = this.base.scrollHeight;
			delete this.isResizingFromBottom;
			return;
		}

		let scrollPosition;
		if (this.base.scrollHeight <= this.base.clientHeight) {
			scrollPosition = MessageList.SCROLL_AT_BOTTOM;
		} else if (this.base.scrollTop === 0) {
			scrollPosition = MessageList.SCROLL_AT_TOP;
		} else if (this.base.scrollHeight === this.base.scrollTop + this.base.clientHeight) {
			scrollPosition = MessageList.SCROLL_AT_BOTTOM;
		} else {
			scrollPosition = MessageList.SCROLL_FREE;
		}

		if (this.scrollPosition !== scrollPosition) {
			this.scrollPosition = scrollPosition;
			const { onScrollTo } = this.props;
			onScrollTo && onScrollTo(scrollPosition);
		}
	}

	handleResize = () => {
		if (this.scrollPosition === MessageList.SCROLL_AT_BOTTOM) {
			this.base.scrollTop = this.base.scrollHeight;
			this.isResizingFromBottom = true;
			return;
		}

		if (this.base.scrollHeight <= this.base.clientHeight) {
			const { onScrollTo } = this.props;
			this.scrollPosition = MessageList.SCROLL_AT_BOTTOM;
			onScrollTo && onScrollTo(MessageList.SCROLL_AT_BOTTOM);
		}
	}

	handleClick = () => {
		const { handleEmojiClick } = this.props;
		handleEmojiClick && handleEmojiClick();
	}

	componentWillUpdate() {
		if (this.scrollPosition === MessageList.SCROLL_AT_TOP) {
			this.previousScrollHeight = this.base.scrollHeight;
		}
	}

	componentDidUpdate() {
		if (this.scrollPosition === MessageList.SCROLL_AT_BOTTOM) {
			this.base.scrollTop = this.base.scrollHeight;
			return;
		}

		if (this.scrollPosition === MessageList.SCROLL_AT_TOP) {
			const delta = this.base.scrollHeight - this.previousScrollHeight;
			if (delta > 0) {
				this.base.scrollTop = delta;
			}
			delete this.previousScrollHeight;
		}

		// when scrollPosition is "free", scroll to bottom
		if (this.scrollPosition === MessageList.SCROLL_FREE) {
			this.base.scrollTop = this.base.scrollHeight;
			const { onScrollTo } = this.props;
			onScrollTo && onScrollTo(MessageList.SCROLL_AT_BOTTOM);
		}
	}

	componentDidMount() {
		this.handleResize();
		window.addEventListener('resize', this.handleResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleResize);
	}

	renderItems = ({
		attachmentResolver = getAttachmentUrl,
		avatarResolver,
		messages,
		lastReadMessageId,
		uid,
		conversationFinishedText,
		typingUsernames,
		resetLastAction,
		postChatUrl,
		chatClosed,
	}) => {
		const items = [];
		const { incomingCallAlert } = store.state;
		const { ongoingCall } = store.state;

		for (let i = 0; i < messages.length; ++i) {
			const previousMessage = messages[i - 1];
			const message = messages[i];
			const nextMessage = messages[i + 1];

			if ((message.t === constants.webRTCCallStartedMessageType || message.t === constants.jitsiCallStartedMessageType)
				&& message.actionLinks && message.actionLinks.length
				&& ongoingCall && isCallOngoing(ongoingCall.callStatus)
				&& !message.webRtcCallEndTs) {
				const { url, callProvider, rid } = incomingCallAlert || {};
				items.push(
					<JoinCallButton callStatus={ongoingCall.callStatus} url={url} callProvider={callProvider} rid={rid} />,
				);
				continue;
			}

			const showDateSeparator = !previousMessage || !isSameDay(parseISO(message.ts), parseISO(previousMessage.ts));
			if (showDateSeparator) {
				items.push(
					<MessageSeparator
						key={`sep-${ message.ts }`}
						use='li'
						date={message.ts}
					/>,
				);
			}

			isNotEmpty(message) && !shouldHideMessage(message) && items.push(
				<Message
					key={message._id}
					attachmentResolver={attachmentResolver}
					avatarResolver={avatarResolver}
					use='li'
					me={isMyMessage(message, uid)}
					msgSequence={msgSequence(messages, i, uid)}
					compact={nextMessage && message.u && nextMessage.u && message.u._id === nextMessage.u._id && !nextMessage.t}
					conversationFinishedText={conversationFinishedText}
					resetLastAction={resetLastAction}
					postChatUrl={postChatUrl}
					chatClosed={chatClosed}
					{...message}
				/>,
			);

			const showUnreadSeparator = lastReadMessageId && nextMessage && lastReadMessageId === message._id;
			if (showUnreadSeparator) {
				items.push(
					<MessageSeparator
						key='unread'
						use='li'
						unread
					/>,
				);
			}
		}

		if (typingUsernames && typingUsernames.length) {
			items.push(
				<TypingIndicator
					key='typing'
					use='li'
					avatarResolver={avatarResolver}
					usernames={typingUsernames}
				/>,
			);
		}

		return items;
	}

	render = ({
		className,
		style = {},
	}) => (
		<div
			onScroll={this.handleScroll}
			className={createClassName(styles, 'message-list', {}, [className])}
			onClick={this.handleClick}
			style={style}
		>
			<ol className={createClassName(styles, 'message-list__content')}>
				{this.renderItems(this.props)}
			</ol>
		</div>
	)
}
