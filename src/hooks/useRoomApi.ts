import { useQuery, useMutation } from '@tanstack/react-query';
import { createRoom, getRoomInfo, type CreateRoomRequest } from '../api/room';

export const roomKeys = {
  all: ['rooms'] as const,
  detail: (roomId: string) => [...roomKeys.all, roomId] as const,
};

export function useCreateRoom() {
  return useMutation({
    mutationFn: (data: CreateRoomRequest) => createRoom(data),
  });
}

export function useRoomInfo(roomId: string | undefined) {
  return useQuery({
    queryKey: roomKeys.detail(roomId || ''),
    queryFn: () => getRoomInfo(roomId!),
    enabled: !!roomId,
  });
}
