import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { VideoGrid } from '../components/VideoGrid';
import { ChatBox } from '../components/ChatBox';
import { RoomClosed } from '../components/RoomClosed';

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = (location.state as { userName?: string })?.userName;

  const {
    isConnected,
    isJoined,
    error,
    localStream,
    remoteStreams,
    messages,
    users,
    userId,
    userName: currentUserName,
    joinRoom,
    leaveRoom,
    sendMessage,
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

    joinRoom(roomId, userName);

    return () => {
      leaveRoom();
    };
  }, [roomId, userName]);

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

  if (error) {
    return <RoomClosed reason={error} />;
  }

  if (!isConnected || !isJoined) {
    return (
      <div className="page room loading">
        <div className="container">
          <p>Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page room">
      <div className="room-header">
        <h2>Room: {roomId}</h2>
        <span className="user-count">{users.length + 1}/4 users</span>
      </div>

      <div className="room-content">
        <div className="video-section">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            localUserName={currentUserName || 'You'}
            users={users}
          />

          <div className="controls">
            <button
              onClick={handleToggleVideo}
              className={`control-btn ${!videoEnabled ? 'off' : ''}`}
              title={videoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              {videoEnabled ? '📹' : '📷'}
            </button>
            <button
              onClick={handleToggleAudio}
              className={`control-btn ${!audioEnabled ? 'off' : ''}`}
              title={audioEnabled ? 'Mute' : 'Unmute'}
            >
              {audioEnabled ? '🎤' : '🔇'}
            </button>
            <button onClick={handleLeave} className="control-btn leave" title="Leave room">
              ❌
            </button>
          </div>
        </div>

        <div className="chat-section">
          <ChatBox
            messages={messages}
            userId={userId || ''}
            onSendMessage={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
