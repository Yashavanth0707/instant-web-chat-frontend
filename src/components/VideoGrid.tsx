import styled from 'styled-components';
import { VideoTile } from './VideoTile';
import type { User } from '../types/room';

const Grid = styled.div<{ $count: number }>`
  flex: 1;
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.black};
  grid-template-columns: ${({ $count }) => $count <= 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)'};
  grid-template-rows: ${({ $count }) => $count > 2 ? 'repeat(2, 1fr)' : '1fr'};
`;

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  localUserName: string;
  users: User[];
}

export function VideoGrid({ localStream, remoteStreams, localUserName, users }: VideoGridProps) {
  const totalVideos = 1 + remoteStreams.size;

  return (
    <Grid $count={totalVideos}>
      <VideoTile stream={localStream} userName={localUserName} isLocal />
      {users.map((user) => {
        const stream = remoteStreams.get(user.socketId) || null;
        return (
          <VideoTile
            key={user.socketId}
            stream={stream}
            userName={user.name}
          />
        );
      })}
    </Grid>
  );
}
