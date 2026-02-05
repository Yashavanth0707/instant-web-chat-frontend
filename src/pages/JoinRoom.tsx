import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomClosed } from '../components/RoomClosed';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const checkRoom = async () => {
      if (!roomId) return;

      try {
        const response = await fetch(`${BACKEND_URL}/api/room/${roomId}`);
        const data = await response.json();

        if (data.success && data.canJoin) {
          setCanJoin(true);
          setUserCount(data.room.userCount);
        } else {
          setRoomError(data.message || data.reason || 'Room is full or does not exist');
        }
      } catch (err) {
        setRoomError('Failed to connect to server');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkRoom();
  }, [roomId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && roomId) {
      navigate(`/room/${roomId}`, { state: { userName: userName.trim() } });
    }
  };

  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Room link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="page join-room">
        <div className="container">
          <p>Checking room...</p>
        </div>
      </div>
    );
  }

  if (!canJoin || roomError) {
    return <RoomClosed reason={roomError || 'Room is full'} />;
  }

  return (
    <div className="page join-room">
      <div className="container">
        <h1>Join Room</h1>
        <p className="room-id">Room: {roomId}</p>
        <p className="user-count">{userCount}/4 users in room</p>

        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            required
            className="input-name"
          />
          <button type="submit" className="btn-primary">
            Join Room
          </button>
        </form>

        <button onClick={copyLink} className="btn-secondary">
          Copy Room Link
        </button>
      </div>
    </div>
  );
}
