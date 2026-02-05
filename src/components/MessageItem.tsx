import { ChatMessage } from '../types/room';

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  if (message.type === 'system') {
    return (
      <div className="message-system">
        <span>{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}>
      {!isOwnMessage && <div className="message-sender">{message.senderName}</div>}
      <div className="message-content">{message.content}</div>
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
