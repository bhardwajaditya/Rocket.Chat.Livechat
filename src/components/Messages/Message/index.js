import { formatDistance } from 'date-fns';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import { h } from 'preact';

import { Livechat } from '../../../api';
import I18n from '../../../i18n';
import { generateLoggerPayload } from '../../../lib/snsLoggerHelper';
import { handleTranscript } from '../../../lib/transcript';
import { isMobile } from '../../../lib/util';
import store from '../../../store';
import { Button } from '../../Button';
import { createClassName, getAttachmentUrl, memo, normalizeTransferHistoryMessage, resolveDate } from '../../helpers';
import { AudioAttachment } from '../AudioAttachment';
import { FileAttachment } from '../FileAttachment';
import { ImageAttachment } from '../ImageAttachment';
import { MessageAction } from '../MessageAction';
import { MessageAvatars } from '../MessageAvatars';
import MessageBlocks from '../MessageBlocks';
import { MessageBubble } from '../MessageBubble';
import { MessageContainer } from '../MessageContainer';
import { MessageContent } from '../MessageContent';
import { MessageText } from '../MessageText';
import { MessageTime } from '../MessageTime';
import { VideoAttachment } from '../VideoAttachment';
import {
	MESSAGE_TYPE_ROOM_NAME_CHANGED,
	MESSAGE_TYPE_USER_ADDED,
	MESSAGE_TYPE_USER_REMOVED,
	MESSAGE_TYPE_USER_JOINED,
	MESSAGE_TYPE_USER_LEFT,
	MESSAGE_TYPE_WELCOME,
	MESSAGE_TYPE_LIVECHAT_CLOSED,
	MESSAGE_TYPE_LIVECHAT_STARTED,
	MESSAGE_TYPE_LIVECHAT_TRANSFER_HISTORY,
	MESSAGE_WEBRTC_CALL,
} from '../constants';
import styles from './styles.scss';

const onClickFeedback = () => {
	const { postChatUrl } = store.state;

	const loggerPayload = generateLoggerPayload('Survey', 'link_clicked', {}, 'customer_action');
	Livechat.sendLogsToSNS(loggerPayload);

	window.open(postChatUrl, '_blank');
};

const onClickTranscript = async () => {
	const loggerPayload = generateLoggerPayload('Transcript Download', 'selected', {}, 'customer_action');
	Livechat.sendLogsToSNS(loggerPayload);

	await handleTranscript();
};

const canPrintTranscript = () => {
	const { transcript, enableTranscriptMobile } = store.state.config.settings;
	const { hidePrint } = store.state;
	if (hidePrint) {
		return false;
	}
	if (isMobile()) {
		return transcript && enableTranscriptMobile;
	}
	return transcript;
};

const renderContent = ({
	text,
	system,
	quoted,
	me,
	msgSequence,
	blocks,
	attachments,
	attachmentResolver,
	mid,
	rid,
	resetLastAction,
	actionsVisible,
	showPostChatUrl,
	isChatClosed,
}) => [
	...(attachments || [])
		.map((attachment) =>
			(attachment.audio_url
				&& <AudioAttachment
					quoted={quoted}
					url={attachmentResolver(attachment.audio_url)}
				/>)
			|| (attachment.video_url
				&& <VideoAttachment
					quoted={quoted}
					url={attachmentResolver(attachment.video_url)}
				/>)
			|| (attachment.image_url
				&& <ImageAttachment
					quoted={quoted}
					url={attachmentResolver(attachment.image_url)}
				/>)
			|| (attachment.title_link
				&& <FileAttachment
					quoted={quoted}
					url={attachmentResolver(attachment.title_link)}
					title={attachment.title}
				/>)
			|| ((attachment.message_link || attachment.tmid) && renderContent({
				text: attachment.text,
				quoted: true,
				attachments: attachment.attachments,
				attachmentResolver,
			}))
			|| (attachment.actions && actionsVisible
				&& <MessageAction
					quoted={false}
					actions={attachment.actions}
					resetLastAction={resetLastAction}
				/>),
		),
	text && (
		<MessageBubble inverse={me} msgSequence={msgSequence} quoted={quoted} system={system}>
			<MessageText style={showPostChatUrl && { width: '300px' }} text={text} system={system} />
			{showPostChatUrl && <Button onClick={() => onClickFeedback()} className = {createClassName(styles, 'closedChatButton__content')}> { I18n.t('Give Feedback') } </Button>}
			{isChatClosed && canPrintTranscript() && <Button onClick={() => onClickTranscript()} className = {createClassName(styles, 'closedChatButton__content')}> { I18n.t('Save Transcript') } </Button>}
		</MessageBubble>
	),
	blocks && (
		<MessageBlocks
			blocks={blocks}
			mid={mid}
			rid={rid}
		/>
	),
].filter(Boolean);


const resolveWebRTCEndCallMessage = ({ webRtcCallEndTs, ts }) => {
	const callEndTime = resolveDate(webRtcCallEndTs);
	const callStartTime = resolveDate(ts);
	const callDuration = formatDistance(callEndTime, callStartTime);
	const time = format(callEndTime, isToday(callEndTime) ? 'HH:mm' : 'dddd HH:mm');
	return `${ I18n.t('Call ended at %{time}', { time }) } ${ I18n.t(' - Lasted %{callDuration}', { callDuration }) }`;
};

const getClosingMessaageText = (conversationFinishedText) => {
	const { postChatUrl, config: { messages: { escalatedConversationFinishedText } } } = store.state;
	if (postChatUrl) {
		return escalatedConversationFinishedText || conversationFinishedText;
	}
	return conversationFinishedText;
};

const getSystemMessageText = ({ t, conversationFinishedText, transferData, u, webRtcCallEndTs, ts }) =>
	(t === MESSAGE_TYPE_ROOM_NAME_CHANGED && I18n.t('Room name changed'))
	|| (t === MESSAGE_TYPE_USER_ADDED && I18n.t('User added by'))
	|| (t === MESSAGE_TYPE_USER_REMOVED && I18n.t('User removed by'))
	|| (t === MESSAGE_TYPE_USER_JOINED && I18n.t('User joined'))
	|| (t === MESSAGE_TYPE_USER_LEFT && I18n.t('User left'))
	|| (t === MESSAGE_TYPE_WELCOME && I18n.t('Welcome'))
	|| (t === MESSAGE_TYPE_LIVECHAT_CLOSED && getClosingMessaageText(conversationFinishedText))
	|| (t === MESSAGE_TYPE_LIVECHAT_STARTED && I18n.t('Chat started'))
	|| (t === MESSAGE_TYPE_LIVECHAT_TRANSFER_HISTORY && normalizeTransferHistoryMessage(transferData, u))
	|| (t === MESSAGE_WEBRTC_CALL && webRtcCallEndTs && ts && resolveWebRTCEndCallMessage({ webRtcCallEndTs, ts }));

const getName = (message) => {
	if (!message.u) {
		return null;
	}

	const { alias, u: { name } } = message;
	return alias && name;
};

const getMessageUsernames = (compact, message) => {
	if (compact || !message.u) {
		return [];
	}

	const { alias, u: { username, name } } = message;
	if (alias && name) {
		return [name];
	}

	return [username];
};

const showPostChatFeedback = ({ chatClosed, message, postChatUrl }) => {
	const { config: { settings: { isPostChatFeedbackEnabled } } } = store.state;

	if (isPostChatFeedbackEnabled && chatClosed && postChatUrl && message.t === MESSAGE_TYPE_LIVECHAT_CLOSED) {
		return true;
	}
	return false;
};

export const Message = memo(({
	avatarResolver,
	attachmentResolver = getAttachmentUrl,
	use,
	me,
	msgSequence,
	compact,
	className,
	style = {},
	resetLastAction,
	postChatUrl,
	chatClosed,
	...message
}) => (
	<MessageContainer
		id={message._id}
		compact={compact}
		reverse={me}
		use={use}
		className={className}
		style={style}
		system={!!message.t}
	>
		{store.state.config.settings.livechat_enable_avatar && !message.t && <MessageAvatars
			avatarResolver={avatarResolver}
			usernames={getMessageUsernames(compact, message)}
			isVisitor={me}
			name={getName(message)}
		/>}
		<MessageContent reverse={me}>
			{renderContent({
				text: message.t ? getSystemMessageText(message) : message.msg,
				system: !!message.t,
				me,
				msgSequence,
				attachments: message.attachments,
				blocks: message.blocks,
				mid: message._id,
				rid: message.rid,
				attachmentResolver,
				resetLastAction,
				actionsVisible: message.actionsVisible ? message.actionsVisible : false,
				showPostChatUrl: showPostChatFeedback({ chatClosed, message, postChatUrl }),
				isChatClosed: message.t === MESSAGE_TYPE_LIVECHAT_CLOSED,
			})}
		</MessageContent>
		{!compact && !message.t && <MessageTime normal={!me} inverse={me} ts={message.ts} />}
	</MessageContainer>
));
