const isMyMessage = (message, uid) => uid && message?.u && uid === message?.u._id;
const msgSequence = (messageList, currentMessage, uid, index) => {
	const textMessages = messageList.reduce((result, message) => {
		if (message.msg) {
			result[message._id] = message;
		}
		return result;
	}, {});
	const textMessageIDs = Object.keys(textMessages);
	const previousMessage = textMessages[textMessageIDs.find((message, i) => textMessageIDs[i + 1] === currentMessage._id)];
	const nextMessage = textMessages[textMessageIDs.find((message, i) => textMessageIDs[i - 1] === currentMessage._id)];

	let sequence = 'mid';

	if (isMyMessage(currentMessage, uid)) {
		if (!previousMessage || !isMyMessage(previousMessage, uid) || messageList[index - 2]?.t) {
			sequence = 'first';
		} else if (!nextMessage || !isMyMessage(nextMessage, uid) || messageList[index + 1]?.t) {
			sequence = 'last';
		}
	} else {
		// eslint-disable-next-line no-lonely-if
		if (!previousMessage || isMyMessage(previousMessage, uid) || messageList[index - 2]?.t) {
			sequence = 'first';
		} else if (!nextMessage || isMyMessage(nextMessage, uid) || messageList[index + 1]?.t) {
			sequence = 'last';
		}
	}

	return sequence;
};

export { isMyMessage, msgSequence };
