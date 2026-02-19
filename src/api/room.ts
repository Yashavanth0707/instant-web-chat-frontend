import type { ChatType } from '../types/room';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface CreateRoomRequest {
  maxUsers: number;
  chatType: ChatType;
}

export interface CreateRoomResponse {
  success: boolean;
  roomId: string;
  maxUsers: number;
  chatType: ChatType;
}

export interface RoomInfo {
  roomId: string;
  userCount: number;
  maxUsers: number;
  chatType: ChatType;
  isFull: boolean;
  users: Array<{ id: string; name: string }>;
}

export interface GetRoomResponse {
  success: boolean;
  canJoin: boolean;
  room: RoomInfo;
  message?: string;
  reason?: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
  const response = await fetch(`${BACKEND_URL}/api/room/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new ApiError(result.message || 'Failed to create room', response.status);
  }

  return result;
}

export async function getRoomInfo(roomId: string): Promise<GetRoomResponse> {
  const response = await fetch(`${BACKEND_URL}/api/room/${roomId}`);
  const result = await response.json();

  if (!response.ok) {
    throw new ApiError(result.message || 'Failed to get room info', response.status);
  }

  return result;
}
