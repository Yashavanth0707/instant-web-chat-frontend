import { useNavigate } from 'react-router-dom';

interface RoomClosedProps {
  reason?: string;
}

export function RoomClosed({ reason = 'Room is full or does not exist' }: RoomClosedProps) {
  const navigate = useNavigate();

  return (
    <div className="room-closed">
      <div className="room-closed-content">
        <h2>Room Closed</h2>
        <p>{reason}</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go Home
        </button>
      </div>
    </div>
  );
}
