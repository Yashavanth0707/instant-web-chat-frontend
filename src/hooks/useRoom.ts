import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../socket/socket';
import type { ChatMessage, ChatType, PeerConnection, User } from '../types/room';
import { getUserMedia, stopMediaStream } from '../webrtc/media';
import {
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  closePeerConnection,
} from '../webrtc/peer';
import { sendDataChannelMessage } from '../webrtc/dataChannel';
import type { DataChannelMessage } from '../webrtc/dataChannel';
import { saveMessage, getAllMessages, clearAllMessages } from '../db/indexedDB';

interface UseRoomReturn {
  isConnected: boolean;
  isJoined: boolean;
  isAdmin: boolean;
  error: string | null;
  roomStopped: boolean;
  chatType: ChatType;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  messages: ChatMessage[];
  users: User[];
  userId: string | null;
  userName: string | null;
  joinRoom: (roomId: string, userName: string, chatType: ChatType) => void;
  leaveRoom: () => void;
  stopRoom: () => void;
  sendMessage: (content: string) => void;
  toggleLocalVideo: (enabled: boolean) => void;
  toggleLocalAudio: (enabled: boolean) => void;
}

export function useRoom(): UseRoomReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomStopped, setRoomStopped] = useState(false);
  const [chatType, setChatType] = useState<ChatType>('video');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const roomIdRef = useRef<string | null>(null);
  const chatTypeRef = useRef<ChatType>('video');
  const localStreamRef = useRef<MediaStream | null>(null);

  // Load messages from IndexedDB on mount
  useEffect(() => {
    getAllMessages().then(setMessages);
  }, []);

  // Handle remote stream
  const handleRemoteStream = useCallback((stream: MediaStream, socketId: string) => {
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.set(socketId, stream);
      return newMap;
    });
  }, []);

  // Handle incoming chat message
  const handleDataChannelMessage = useCallback(
    async (message: DataChannelMessage, _socketId: string) => {
      if (message.type === 'chat') {
        const chatMessage: ChatMessage = {
          id: message.payload.id,
          senderId: message.payload.senderId,
          senderName: message.payload.senderName,
          content: message.payload.content,
          timestamp: message.payload.timestamp,
          type: 'text',
        };
        await saveMessage(chatMessage);
        setMessages((prev) => [...prev, chatMessage]);
      }
    },
    []
  );

  // Create peer connection for a new user
  const createPeerForUser = useCallback(
    (
      socket: Socket,
      targetSocketId: string,
      targetUserId: string,
      targetUserName: string,
      stream: MediaStream | null,
      isInitiator: boolean
    ): PeerConnection => {
      const peer = createPeerConnection(
        socket,
        targetSocketId,
        targetUserId,
        targetUserName,
        stream,
        handleRemoteStream,
        handleDataChannelMessage,
        isInitiator
      );
      peerConnectionsRef.current.set(targetSocketId, peer);
      return peer;
    },
    [handleRemoteStream, handleDataChannelMessage]
  );

  // Join room
  const joinRoom = useCallback(async (roomId: string, name: string, type: ChatType = 'video') => {
    try {
      setError(null);
      roomIdRef.current = roomId;
      chatTypeRef.current = type;
      setChatType(type);

      // Get user media only for video chat (reuse existing stream if available)
      let stream: MediaStream | null = localStreamRef.current;
      if (type === 'video' && !stream) {
        stream = await getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
      }

      // Connect socket (reuses existing if available)
      const socket = connectSocket();
      socketRef.current = socket;

      // Remove any existing listeners before adding new ones
      socket.off('connect');
      socket.off('join-success');
      socket.off('join-error');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('room-closed');
      socket.off('room-stopped');
      socket.off('disconnect');

      // Socket event handlers
      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('join-room', { roomId, userName: name });
      });

      socket.on('join-success', async ({ userId: id, userName: uName, users: existingUsers, isAdmin: admin }) => {
        setUserId(id);
        setUserName(uName);
        setIsJoined(true);
        setIsAdmin(admin || false);

        // Add system message
        const joinMsg: ChatMessage = {
          id: `system-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `You joined the room`,
          timestamp: Date.now(),
          type: 'system',
        };
        await saveMessage(joinMsg);
        setMessages((prev) => [...prev, joinMsg]);

        // Create peer connections for existing users
        const userList: User[] = [];
        for (const user of existingUsers) {
          userList.push(user);
          const peer = createPeerForUser(
            socket,
            user.socketId,
            user.id,
            user.name,
            stream,
            true
          );
          await createOffer(peer, socket);
        }
        setUsers(userList);
      });

      socket.on('join-error', ({ message }) => {
        setError(message);
        stopMediaStream(stream);
        setLocalStream(null);
        disconnectSocket();
      });

      socket.on('user-joined', async ({ userId: uId, userName: uName, socketId }) => {
        // Add new user to list
        const newUser: User = { id: uId, name: uName, socketId };
        setUsers((prev) => [...prev, newUser]);

        // Add system message
        const joinMsg: ChatMessage = {
          id: `system-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `${uName} joined the room`,
          timestamp: Date.now(),
          type: 'system',
        };
        await saveMessage(joinMsg);
        setMessages((prev) => [...prev, joinMsg]);

        // Create peer connection (will receive offer from new user)
        createPeerForUser(socket, socketId, uId, uName, stream, false);
      });

      socket.on('user-left', async ({ userId: uId, userName: uName, socketId }) => {
        // Remove user from list
        setUsers((prev) => prev.filter((u) => u.id !== uId));

        // Add system message
        const leaveMsg: ChatMessage = {
          id: `system-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `${uName} left the room`,
          timestamp: Date.now(),
          type: 'system',
        };
        await saveMessage(leaveMsg);
        setMessages((prev) => [...prev, leaveMsg]);

        // Close and remove peer connection
        const peer = peerConnectionsRef.current.get(socketId);
        if (peer) {
          closePeerConnection(peer);
          peerConnectionsRef.current.delete(socketId);
        }

        // Remove remote stream
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      });

      socket.on('offer', async ({ offer, senderSocketId, senderUserId, senderName }) => {
        let peer = peerConnectionsRef.current.get(senderSocketId);
        if (!peer) {
          peer = createPeerForUser(socket, senderSocketId, senderUserId, senderName, stream, false);
        }
        await handleOffer(peer, offer, socket);
      });

      socket.on('answer', async ({ answer, senderSocketId }) => {
        const peer = peerConnectionsRef.current.get(senderSocketId);
        if (peer) {
          await handleAnswer(peer, answer);
        }
      });

      socket.on('ice-candidate', async ({ candidate, senderSocketId }) => {
        const peer = peerConnectionsRef.current.get(senderSocketId);
        if (peer) {
          await handleIceCandidate(peer, candidate);
        }
      });

      socket.on('room-closed', async () => {
        await clearAllMessages();
        setMessages([]);
      });

      socket.on('room-stopped', async () => {
        setRoomStopped(true);
        await clearAllMessages();
        setMessages([]);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        setIsJoined(false);
      });

      // If already connected, emit join immediately (after all listeners are registered)
      if (socket.connected) {
        setIsConnected(true);
        socket.emit('join-room', { roomId, userName: name });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    }
  }, [createPeerForUser]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((peer) => {
      closePeerConnection(peer);
    });
    peerConnectionsRef.current.clear();

    // Stop local media
    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Clear remote streams
    setRemoteStreams(new Map());

    // Clear messages and IndexedDB
    await clearAllMessages();
    setMessages([]);

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      disconnectSocket();
      socketRef.current = null;
    }

    // Reset state
    setIsConnected(false);
    setIsJoined(false);
    setIsAdmin(false);
    setUsers([]);
    setUserId(null);
    setUserName(null);
    roomIdRef.current = null;
  }, []);

  // Stop room (admin only)
  const stopRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('stop-room');
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || !userName) return;

      const chatMessage: ChatMessage = {
        id: `${userId}-${Date.now()}`,
        senderId: userId,
        senderName: userName,
        content,
        timestamp: Date.now(),
        type: 'text',
      };

      // Save locally
      await saveMessage(chatMessage);
      setMessages((prev) => [...prev, chatMessage]);

      // Send via data channels
      const dataMessage: DataChannelMessage = {
        type: 'chat',
        payload: chatMessage,
      };

      peerConnectionsRef.current.forEach((peer) => {
        if (peer.dataChannel) {
          sendDataChannelMessage(peer.dataChannel, dataMessage);
        }
      });
    },
    [userId, userName]
  );

  // Toggle video
  const toggleLocalVideo = useCallback(
    (enabled: boolean) => {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = enabled;
        });
      }
    },
    [localStream]
  );

  // Toggle audio
  const toggleLocalAudio = useCallback(
    (enabled: boolean) => {
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = enabled;
        });
      }
    },
    [localStream]
  );

  // Cleanup on page unload (not on React unmount, to avoid StrictMode issues)
  useEffect(() => {
    const handleBeforeUnload = () => {
      peerConnectionsRef.current.forEach((peer) => {
        closePeerConnection(peer);
      });
      if (localStreamRef.current) {
        stopMediaStream(localStreamRef.current);
      }
      disconnectSocket();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    isConnected,
    isJoined,
    isAdmin,
    error,
    roomStopped,
    chatType,
    localStream,
    remoteStreams,
    messages,
    users,
    userId,
    userName,
    joinRoom,
    leaveRoom,
    stopRoom,
    sendMessage,
    toggleLocalVideo,
    toggleLocalAudio,
  };
}
