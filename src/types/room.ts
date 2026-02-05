export interface User {
  id: string;
  name: string;
  socketId: string;
}

export type ChatType = 'text' | 'video';

export interface RoomInfo {
  roomId: string;
  userCount: number;
  maxUsers: number;
  chatType: ChatType;
  isFull: boolean;
  users: Omit<User, 'socketId'>[];
}

export interface RoomSettings {
  maxUsers: number;
  chatType: ChatType;
  adminName: string;
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
