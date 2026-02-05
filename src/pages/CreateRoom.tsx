import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function CreateRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        navigate(`/join/${data.roomId}`);
      } else {
        setError('Failed to create room');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page create-room">
      <div className="container">
        <h1>Instant Web Chat</h1>
        <p className="subtitle">P2P Video & Text Chat (Max 4 users)</p>

        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="btn-primary btn-large"
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>

        {error && <p className="error">{error}</p>}

        <div className="features">
          <div className="feature">
            <span className="feature-icon">📹</span>
            <span>Video Chat</span>
          </div>
          <div className="feature">
            <span className="feature-icon">💬</span>
            <span>Text Chat</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>P2P Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
