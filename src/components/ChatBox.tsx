import { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../types/room';
import { MessageItem } from './MessageItem';

const Box = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
`;

const TypingIndicator = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TypingDots = styled.span`
  display: flex;
  gap: 3px;
`;

const Dot = styled.span<{ $delay: number }>`
  width: 6px;
  height: 6px;
  background: ${({ theme }) => theme.colors.textMuted};
  border-radius: 50%;
  animation: ${bounce} 1.4s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}ms;
`;

const InputForm = styled.form`
  display: flex;
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.white};
  font-size: ${({ theme }) => theme.fontSize.md};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textDark};
  }
`;

const SendButton = styled.button`
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.border};
    cursor: not-allowed;
  }
`;

interface ChatBoxProps {
  messages: ChatMessage[];
  userId: string;
  onSendMessage: (content: string) => void;
  typingUsers?: string[];
  onTyping?: (isTyping: boolean) => void;
}

export function ChatBox({
  messages,
  userId,
  onSendMessage,
  typingUsers = [],
  onTyping
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      if (onTyping) {
        onTyping(false);
      }
    }
  };

  return (
    <Box>
      <Messages>
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwnMessage={msg.senderId === userId}
          />
        ))}
        <div ref={messagesEndRef} />
      </Messages>

      {typingUsers.length > 0 && (
        <TypingIndicator>
          <TypingDots>
            <Dot $delay={0} />
            <Dot $delay={200} />
            <Dot $delay={400} />
          </TypingDots>
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.join(', ')} are typing...`
          }
        </TypingIndicator>
      )}

      <InputForm onSubmit={handleSubmit}>
        <Input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
        />
        <SendButton type="submit" disabled={!input.trim()}>
          <Send size={18} />
        </SendButton>
      </InputForm>
    </Box>
  );
}
