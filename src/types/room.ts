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
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'file';
  file?: FileInfo;
}

export interface FileInfo {
  name: string;
  size: number;
  mimeType: string;
  data?: ArrayBuffer;
  /** Base64-encoded data for IndexedDB storage */
  dataBase64?: string;
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  receivedChunks: Map<number, string>;
  senderId: string;
  senderName: string;
}

export interface PeerConnection {
  socketId: string;
  userId: string;
  userName: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  stream?: MediaStream;
}
