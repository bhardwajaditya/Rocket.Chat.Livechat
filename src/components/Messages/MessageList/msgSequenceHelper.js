const isMyMessage = (message, uid) => uid && message?.u && uid === message?.u._id;
const msgSequence = (messageList, index, uid) => {
	let previousMessage;
	let nextMessage;

	for (let i = index - 1; i >= 0; i--) {
		if (messageList?.[i]?.msg || messageList?.[i]?.t) {
			previousMessage = messageList?.[i];
			break;
		}
	}
	for (let i = index + 1; i < messageList.length; i++) {
		if (messageList?.[i]?.msg || messageList?.[i]?.t) {
			nextMessage = messageList?.[i];
			break;
		}
	}

	let sequence = 'mid';

	if (isMyMessage(messageList[index], uid)) {
		if (!previousMessage || !isMyMessage(previousMessage, uid) || previousMessage?.t) {
			sequence = 'first';
		} else if (!nextMessage || !isMyMessage(nextMessage, uid) || nextMessage?.t) {
			sequence = 'last';
		}
	} else {
		// eslint-disable-next-line no-lonely-if
		if (!previousMessage || isMyMessage(previousMessage, uid) || previousMessage?.t) {
			sequence = 'first';
		} else if (!nextMessage || isMyMessage(nextMessage, uid) || nextMessage?.t) {
			sequence = 'last';
		}
	}

	return sequence;
};

export { isMyMessage, msgSequence };
