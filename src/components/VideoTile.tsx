import { useEffect, useRef } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  userName: string;
  isLocal?: boolean;
  muted?: boolean;
}

export function VideoTile({ stream, userName, isLocal = false, muted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          backgroundColor: '#1a1a1a',
        }}
      />
      <div className="video-label">
        {userName} {isLocal && '(You)'}
      </div>
    </div>
  );
}
