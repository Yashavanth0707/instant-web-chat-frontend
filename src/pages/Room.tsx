import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  LogOut,
  MessageSquare,
  Users,
  Loader2,
  XCircle
} from 'lucide-react';
import { useRoom } from '../hooks/useRoom';
import { VideoGrid } from '../components/VideoGrid';
import { ChatBox } from '../components/ChatBox';
import { RoomClosed } from '../components/RoomClosed';
import type { ChatType } from '../types/room';

const Page = styled.div<{ $isVideo: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RoomTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.base};
  color: ${({ theme }) => theme.colors.white};
  margin: 0;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Badge = styled.span`
  padding: ${({ theme }) => theme.spacing.xs} 10px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const UserCount = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const HeaderButton = styled.button<{ $danger?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme, $danger }) => $danger ? theme.colors.error : theme.colors.border};
  color: ${({ theme }) => theme.colors.white};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme, $danger }) => $danger ? theme.colors.errorHover : '#444'};
  }
`;

const Content = styled.div<{ $isVideo: boolean }>`
  display: flex;
  flex: 1;
  overflow: hidden;
  justify-content: ${({ $isVideo }) => $isVideo ? 'flex-start' : 'center'};
`;

const VideoSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  min-height: 0;
  overflow: hidden;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
`;

const ControlButton = styled.button<{ $off?: boolean; $danger?: boolean }>`
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme, $off, $danger }) =>
    $danger ? theme.colors.error :
    $off ? theme.colors.error :
    theme.colors.border};
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme, $off, $danger }) =>
      $danger ? theme.colors.errorHover :
      $off ? theme.colors.errorHover :
      '#444'};
  }
`;

const ChatSection = styled.div<{ $fullWidth: boolean }>`
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : '350px'};
  max-width: ${({ $fullWidth }) => $fullWidth ? '800px' : 'none'};
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border-left: ${({ $fullWidth, theme }) => $fullWidth ? 'none' : `1px solid ${theme.colors.border}`};

  @media (max-width: 768px) {
    width: 100%;
    height: ${({ $fullWidth }) => $fullWidth ? '100%' : '40vh'};
    border-left: none;
    border-top: ${({ $fullWidth, theme }) => $fullWidth ? 'none' : `1px solid ${theme.colors.border}`};
  }
`;

const TextChatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceLight};
`;

const Participants = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Participant = styled.span<{ $isYou?: boolean }>`
  padding: ${({ theme }) => theme.spacing.xs} 10px;
  background: ${({ theme, $isYou }) => $isYou ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.white};
`;

const LeaveButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.colors.white};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.errorHover};
  }
`;

const LoadingPage = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SpinnerIcon = styled(Loader2)`
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface LocationState {
  userName?: string;
  chatType?: ChatType;
}

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const userName = state?.userName;
  const initialChatType = state?.chatType || 'video';

  const {
    isConnected,
    isJoined,
    isAdmin,
    error,
    roomStopped,
    chatType,
    localStream,
    remoteStreams,
    messages,
    users,
    userId,
    userName: currentUserName,
    joinRoom,
    leaveRoom,
    stopRoom,
    sendMessage,
    sendFileMessage,
    fileError,
    clearFileError,
    fileTransferProgress,
    fileSendProgress,
    toggleLocalVideo,
    toggleLocalAudio,
  } = useRoom();

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    if (!userName || !roomId) {
      navigate(`/join/${roomId}`);
      return;
    }

    // joinRoom internally clears old listeners before adding new ones,
    // so calling it again on StrictMode remount is safe
    joinRoom(roomId, userName, initialChatType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName, initialChatType]);

  const handleToggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    toggleLocalVideo(newState);
  };

  const handleToggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    toggleLocalAudio(newState);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const handleStopRoom = () => {
    stopRoom();
    navigate('/');
  };

  if (error) {
    return <RoomClosed reason={error} />;
  }

  if (roomStopped) {
    return <RoomClosed reason="Room was closed by the admin" />;
  }

  if (!isConnected || !isJoined) {
    return (
      <LoadingPage>
        <LoadingWrapper>
          <SpinnerIcon size={32} />
          <LoadingText>Connecting to room...</LoadingText>
        </LoadingWrapper>
      </LoadingPage>
    );
  }

  const isVideoChat = chatType === 'video';

  return (
    <Page $isVideo={isVideoChat}>
      <Header>
        <RoomTitle>Room: {roomId}</RoomTitle>
        <HeaderInfo>
          <Badge>
            {isVideoChat ? <Video size={14} /> : <MessageSquare size={14} />}
            {isVideoChat ? 'Video' : 'Text'}
          </Badge>
          <UserCount>
            <Users size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {users.length + 1} users
          </UserCount>
          <HeaderButtons>
            <HeaderButton onClick={handleLeave}>
              <LogOut size={14} />
              Leave
            </HeaderButton>
            {isAdmin && (
              <HeaderButton $danger onClick={handleStopRoom}>
                <XCircle size={14} />
                Stop Room
              </HeaderButton>
            )}
          </HeaderButtons>
        </HeaderInfo>
      </Header>

      <Content $isVideo={isVideoChat}>
        {isVideoChat && (
          <VideoSection>
            <VideoGrid
              localStream={localStream}
              remoteStreams={remoteStreams}
              localUserName={currentUserName || 'You'}
              users={users}
            />

            <Controls>
              <ControlButton
                onClick={handleToggleVideo}
                $off={!videoEnabled}
                title={videoEnabled ? 'Turn off video' : 'Turn on video'}
              >
                {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </ControlButton>
              <ControlButton
                onClick={handleToggleAudio}
                $off={!audioEnabled}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </ControlButton>
              {isAdmin && (
                <ControlButton onClick={handleStopRoom} $danger title="Stop room for everyone">
                  <XCircle size={20} />
                </ControlButton>
              )}
            </Controls>
          </VideoSection>
        )}

        <ChatSection $fullWidth={!isVideoChat}>
          {!isVideoChat && (
            <TextChatHeader>
              <Participants>
                <Participant $isYou>{currentUserName} (You)</Participant>
                {users.map((user) => (
                  <Participant key={user.id}>{user.name}</Participant>
                ))}
              </Participants>
              <LeaveButton onClick={handleLeave} title="Leave room">
                <LogOut size={16} />
                Leave
              </LeaveButton>
            </TextChatHeader>
          )}
          <ChatBox
            messages={messages}
            userId={userId || ''}
            onSendMessage={sendMessage}
            onSendFile={sendFileMessage}
            fileTransferProgress={fileTransferProgress}
            fileSendProgress={fileSendProgress}
            fileError={fileError}
            onClearFileError={clearFileError}
          />
        </ChatSection>
      </Content>
    </Page>
  );
}
