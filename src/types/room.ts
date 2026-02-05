export interface User {
  id: string;
  name: string;
  socketId: string;
}

export interface RoomInfo {
  roomId: string;
  userCount: number;
  maxUsers: number;
  isFull: boolean;
  users: Omit<User, 'socketId'>[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface PeerConnection {
  socketId: string;
  userId: string;
  userName: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  stream?: MediaStream;
}
