import { useCallback } from 'react';
import styled from 'styled-components';
import { FileText, Image, Film, Music, Download } from 'lucide-react';
import type { ChatMessage } from '../types/room';
import { base64ToArrayBuffer } from '../webrtc/dataChannel';

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

const FileContent = styled.div<{ $isOwn: boolean }>`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme, $isOwn }) => $isOwn ? theme.colors.primary : theme.colors.border};
  color: ${({ theme }) => theme.colors.white};
  border-bottom-right-radius: ${({ $isOwn, theme }) => $isOwn ? theme.borderRadius.sm : theme.borderRadius.lg};
  border-bottom-left-radius: ${({ $isOwn, theme }) => $isOwn ? theme.borderRadius.lg : theme.borderRadius.sm};
`;

const FileRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileSize = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  opacity: 0.7;
`;

const DownloadButton = styled.button`
  padding: 6px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const ImagePreview = styled.img`
  max-width: 250px;
  max-height: 200px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  object-fit: contain;
`;

const VideoPreview = styled.video`
  max-width: 250px;
  max-height: 200px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const AudioPreview = styled.audio`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={20} />;
  if (mimeType.startsWith('video/')) return <Film size={20} />;
  if (mimeType.startsWith('audio/')) return <Music size={20} />;
  return <FileText size={20} />;
}

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const handleDownload = useCallback(() => {
    if (!message.file?.dataBase64) return;
    const buffer = base64ToArrayBuffer(message.file.dataBase64);
    const blob = new Blob([buffer], { type: message.file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = message.file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [message.file]);

  if (message.type === 'system') {
    return (
      <SystemMessage>
        <span>{message.content}</span>
      </SystemMessage>
    );
  }

  if (message.type === 'file' && message.file) {
    const { name, size, mimeType, dataBase64 } = message.file;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');
    const dataUrl = dataBase64 ? `data:${mimeType};base64,${dataBase64}` : undefined;

    return (
      <Message $isOwn={isOwnMessage}>
        {!isOwnMessage && <Sender>{message.senderName}</Sender>}
        <FileContent $isOwn={isOwnMessage}>
          <FileRow>
            {getFileIcon(mimeType)}
            <FileInfo>
              <FileName title={name}>{name}</FileName>
              <FileSize>{formatFileSize(size)}</FileSize>
            </FileInfo>
            {dataBase64 && (
              <DownloadButton onClick={handleDownload} title="Download">
                <Download size={18} />
              </DownloadButton>
            )}
          </FileRow>
          {isImage && dataUrl && (
            <ImagePreview
              src={dataUrl}
              alt={name}
              onClick={handleDownload}
            />
          )}
          {isVideo && dataUrl && (
            <VideoPreview controls>
              <source src={dataUrl} type={mimeType} />
            </VideoPreview>
          )}
          {isAudio && dataUrl && (
            <AudioPreview controls>
              <source src={dataUrl} type={mimeType} />
            </AudioPreview>
          )}
        </FileContent>
        <Time $isOwn={isOwnMessage}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Time>
      </Message>
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
