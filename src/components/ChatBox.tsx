import { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Send, Smile, Paperclip, X, Upload, Download } from 'lucide-react';
import type { ChatMessage } from '../types/room';
import { MessageItem } from './MessageItem';

const EMOJI_LIST = [
  '😀', '😂', '😍', '🥰', '😎', '🤩', '😢', '😭',
  '😡', '🤔', '🙄', '😴', '🤗', '😱', '🥳', '😇',
  '👍', '👎', '👋', '🙌', '💪', '🤝', '✌️', '🫡',
  '❤️', '🔥', '⭐', '💯', '🎉', '👏', '💀', '😈',
  '🫶', '🤣', '😊', '🥺', '😤', '🤡', '💔', '✅',
];

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

const InputRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  flex: 1;
  position: relative;
`;

const EmojiButton = styled.button`
  padding: 8px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: color ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.border};
  }
`;

const EmojiPicker = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  z-index: 10;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
`;

const EmojiItem = styled.button`
  padding: 6px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  line-height: 1;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.border};
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

const FileButton = styled.button`
  padding: 8px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: color ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.border};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const TransferProgressBar = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TransferItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 2px;
  transition: width 0.2s ease;
`;

const FileErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.colors.white};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const FileErrorClose = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  opacity: 0.8;

  &:hover {
    opacity: 1;
  }
`;

interface ChatBoxProps {
  messages: ChatMessage[];
  userId: string;
  onSendMessage: (content: string) => void;
  onSendFile?: (file: File) => void;
  fileTransferProgress?: Map<string, number>;
  fileSendProgress?: { fileName: string; percent: number } | null;
  fileError?: string | null;
  onClearFileError?: () => void;
  typingUsers?: string[];
  onTyping?: (isTyping: boolean) => void;
}

export function ChatBox({
  messages,
  userId,
  onSendMessage,
  onSendFile,
  fileTransferProgress,
  fileSendProgress,
  fileError,
  onClearFileError,
  typingUsers = [],
  onTyping
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-dismiss file error after 5 seconds
  useEffect(() => {
    if (fileError && onClearFileError) {
      const timer = setTimeout(onClearFileError, 5000);
      return () => clearTimeout(timer);
    }
  }, [fileError, onClearFileError]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojis(false);
      }
    };
    if (showEmojis) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojis]);

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

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendFile) {
      onSendFile(file);
    }
    // Reset so same file can be selected again
    e.target.value = '';
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

      {(fileSendProgress || (fileTransferProgress && fileTransferProgress.size > 0)) && (
        <TransferProgressBar>
          {fileSendProgress && (
            <TransferItem>
              <Upload size={14} />
              Sending {fileSendProgress.fileName}... {fileSendProgress.percent}%
              <ProgressTrack>
                <ProgressFill $percent={fileSendProgress.percent} />
              </ProgressTrack>
            </TransferItem>
          )}
          {fileTransferProgress && Array.from(fileTransferProgress.entries()).map(([id, percent]) => (
            <TransferItem key={id}>
              <Download size={14} />
              Receiving file... {percent}%
              <ProgressTrack>
                <ProgressFill $percent={percent} />
              </ProgressTrack>
            </TransferItem>
          ))}
        </TransferProgressBar>
      )}

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

      {fileError && (
        <FileErrorBar>
          <span>{fileError}</span>
          <FileErrorClose onClick={onClearFileError} title="Dismiss">
            <X size={16} />
          </FileErrorClose>
        </FileErrorBar>
      )}

      <InputForm onSubmit={handleSubmit}>
        <InputRow ref={emojiPickerRef}>
          <EmojiButton type="button" onClick={() => setShowEmojis((prev) => !prev)} title="Emojis">
            <Smile size={20} />
          </EmojiButton>
          {showEmojis && (
            <EmojiPicker>
              {EMOJI_LIST.map((emoji) => (
                <EmojiItem key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)}>
                  {emoji}
                </EmojiItem>
              ))}
            </EmojiPicker>
          )}
          {onSendFile && (
            <>
              <FileButton type="button" onClick={() => fileInputRef.current?.click()} title="Send file">
                <Paperclip size={20} />
              </FileButton>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              />
            </>
          )}
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
          />
        </InputRow>
        <SendButton type="submit" disabled={!input.trim()}>
          <Send size={18} />
        </SendButton>
      </InputForm>
    </Box>
  );
}
