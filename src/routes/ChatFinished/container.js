import { h, Component } from 'preact';
import { route } from 'preact-router';

import I18n from '../../i18n';
import { isMobile } from '../../lib/util';
import { Consumer } from '../../store';
import ChatFinished from './component';


export class ChatFinishedContainer extends Component {
	handleRedirect = () => {
		route('/');
	}

	render = (props) => {
		if (!isMobile()) {
			return route('/');
		}
		return <ChatFinished {...props} onRedirectChat={this.handleRedirect} />;
	}
}


export const ChatFinishedConnector = ({ ref, ...props }) => (
	<Consumer>
		{({
			config: {
				messages: {
					conversationFinishedMessage: greeting,
					conversationFinishedText: message,
				} = {},
				theme: {
					color,
				} = {},
			} = {},
			iframe: {
				theme: {
					color: customColor,
					fontColor: customFontColor,
					iconColor: customIconColor,
				} = {},
			} = {},
		}) => (
			<ChatFinishedContainer
				ref={ref}
				{...props}
				theme={{
					color: customColor || color,
					fontColor: customFontColor,
					iconColor: customIconColor,
				}}
				title={I18n.t('Chat Finished')}
				greeting={greeting}
				message={message}
			/>
		)}
	</Consumer>
);


export default ChatFinishedConnector;
