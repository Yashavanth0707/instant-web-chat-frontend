import styled from 'styled-components';
import type { ChatMessage } from '../types/room';

const SystemMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textDark};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Message = styled.div<{ $isOwn: boolean }>`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  max-width: 85%;
  margin-left: ${({ $isOwn }) => $isOwn ? 'auto' : '0'};
  margin-right: ${({ $isOwn }) => $isOwn ? '0' : 'auto'};
`;

const Sender = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Content = styled.div<{ $isOwn: boolean }>`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  word-wrap: break-word;
  background: ${({ theme, $isOwn }) => $isOwn ? theme.colors.primary : theme.colors.border};
  color: ${({ theme }) => theme.colors.white};
  border-bottom-right-radius: ${({ $isOwn, theme }) => $isOwn ? theme.borderRadius.sm : theme.borderRadius.lg};
  border-bottom-left-radius: ${({ $isOwn, theme }) => $isOwn ? theme.borderRadius.lg : theme.borderRadius.sm};
`;

const Time = styled.div<{ $isOwn: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textDark};
  margin-top: ${({ theme }) => theme.spacing.xs};
  text-align: ${({ $isOwn }) => $isOwn ? 'right' : 'left'};
`;

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  if (message.type === 'system') {
    return (
      <SystemMessage>
        <span>{message.content}</span>
      </SystemMessage>
    );
  }

  return (
    <Message $isOwn={isOwnMessage}>
      {!isOwnMessage && <Sender>{message.senderName}</Sender>}
      <Content $isOwn={isOwnMessage}>{message.content}</Content>
      <Time $isOwn={isOwnMessage}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Time>
    </Message>
  );
}
