import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../socket/socket';
import { ChatMessage, PeerConnection, User } from '../types/room';
import { getUserMedia, stopMediaStream } from '../webrtc/media';
import {
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  closePeerConnection,
} from '../webrtc/peer';
import { DataChannelMessage, sendDataChannelMessage } from '../webrtc/dataChannel';
import { saveMessage, getAllMessages, clearAllMessages } from '../db/indexedDB';

interface UseRoomReturn {
  isConnected: boolean;
  isJoined: boolean;
  error: string | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  messages: ChatMessage[];
  users: User[];
  userId: string | null;
  userName: string | null;
  joinRoom: (roomId: string, userName: string) => void;
  leaveRoom: () => void;
  sendMessage: (content: string) => void;
  toggleLocalVideo: (enabled: boolean) => void;
  toggleLocalAudio: (enabled: boolean) => void;
}

export function useRoom(): UseRoomReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const roomIdRef = useRef<string | null>(null);

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
  const joinRoom = useCallback(async (roomId: string, name: string) => {
    try {
      setError(null);
      roomIdRef.current = roomId;

      // Get user media
      const stream = await getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      // Connect socket
      const socket = connectSocket();
      socketRef.current = socket;

      // Socket event handlers
      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('join-room', { roomId, userName: name });
      });

      socket.on('join-success', async ({ userId: id, userName: uName, users: existingUsers }) => {
        setUserId(id);
        setUserName(uName);
        setIsJoined(true);

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

      socket.on('disconnect', () => {
        setIsConnected(false);
        setIsJoined(false);
      });
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
    stopMediaStream(localStream);
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
    setUsers([]);
    setUserId(null);
    setUserName(null);
    roomIdRef.current = null;
  }, [localStream]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((peer) => {
        closePeerConnection(peer);
      });
      stopMediaStream(localStream);
      disconnectSocket();
    };
  }, [localStream]);

  return {
    isConnected,
    isJoined,
    error,
    localStream,
    remoteStreams,
    messages,
    users,
    userId,
    userName,
    joinRoom,
    leaveRoom,
    sendMessage,
    toggleLocalVideo,
    toggleLocalAudio,
  };
}
