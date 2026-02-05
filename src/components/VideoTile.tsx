import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Tile = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
`;

const Video = styled.video<{ $isLocal: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: ${({ $isLocal }) => $isLocal ? 'scaleX(-1)' : 'none'};
  background-color: ${({ theme }) => theme.colors.surface};
  display: block;
`;

const Label = styled.div`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing.sm};
  left: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.white};
  font-size: ${({ theme }) => theme.fontSize.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

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
    <Tile>
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || muted}
        $isLocal={isLocal}
      />
      <Label>
        {userName} {isLocal && '(You)'}
      </Label>
    </Tile>
  );
}
