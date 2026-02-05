import { VideoTile } from './VideoTile';
import { User } from '../types/room';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  localUserName: string;
  users: User[];
}

export function VideoGrid({ localStream, remoteStreams, localUserName, users }: VideoGridProps) {
  const totalVideos = 1 + remoteStreams.size;
  const gridClass = totalVideos <= 2 ? 'grid-2' : 'grid-4';

  return (
    <div className={`video-grid ${gridClass}`}>
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
    </div>
  );
}
