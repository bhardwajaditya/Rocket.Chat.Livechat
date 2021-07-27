import { h } from 'preact';

import store from '../../../store';
import { createClassName, memo } from '../../helpers';
import styles from './styles.scss';

export const MessageBubble = memo(({
	inverse,
	msgSequence,
	nude,
	quoted,
	className,
	style = {},
	children,
	system = false,
}) => {
	const friendlyChat = store.state.config.settings.livechat_friendly_chat;
	const styleConfig = {
		inverse,
		friendlyChat,
		nude,
		quoted,
		system,
		myfirst: friendlyChat && inverse && msgSequence === 'first',
		mymid: friendlyChat && inverse && msgSequence === 'mid',
		mylast: friendlyChat && inverse && msgSequence === 'last',
		yourfirst: friendlyChat && !inverse && msgSequence === 'first',
		yourmid: friendlyChat && !inverse && msgSequence === 'mid',
		yourlast: friendlyChat && !inverse && msgSequence === 'last',
	};

	return (
		<div className={createClassName(styles, 'message-bubble', styleConfig, [className])} style={style}>
			<div className={createClassName(styles, 'message-bubble__inner')}>
				{children}
			</div>
		</div>
	);
});
