import { useState, useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "../socket/socket";
import type {
  ChatMessage,
  ChatType,
  FileTransfer,
  PeerConnection,
  User,
} from "../types/room";
import { getUserMedia, stopMediaStream } from "../webrtc/media";
import {
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  closePeerConnection,
} from "../webrtc/peer";
import {
  sendDataChannelMessage,
  sendFile,
  reassembleChunks,
  arrayBufferToBase64,
  MAX_FILE_SIZE,
} from "../webrtc/dataChannel";
import type { DataChannelMessage } from "../webrtc/dataChannel";
import {
  saveMessage,
  clearAllMessages,
  clearMessagesByRoomId,
} from "../db/indexedDB";

interface UseRoomReturn {
  isConnected: boolean;
  isJoined: boolean;
  isAdmin: boolean;
  error: string | null;
  fileError: string | null;
  roomStopped: boolean;
  chatType: ChatType;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  messages: ChatMessage[];
  users: User[];
  userId: string | null;
  userName: string | null;
  fileTransferProgress: Map<string, number>;
  fileSendProgress: { fileName: string; percent: number } | null;
  joinRoom: (roomId: string, userName: string, chatType: ChatType) => void;
  leaveRoom: () => void;
  stopRoom: () => void;
  sendMessage: (content: string) => void;
  sendFileMessage: (file: File) => void;
  clearFileError: () => void;
  toggleLocalVideo: (enabled: boolean) => void;
  toggleLocalAudio: (enabled: boolean) => void;
}

export function useRoom(): UseRoomReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomStopped, setRoomStopped] = useState(false);
  const [chatType, setChatType] = useState<ChatType>("video");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [fileError, setFileError] = useState<string | null>(null);
  const [fileTransferProgress, setFileTransferProgress] = useState<
    Map<string, number>
  >(new Map());
  const [fileSendProgress, setFileSendProgress] = useState<{
    fileName: string;
    percent: number;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const roomIdRef = useRef<string | null>(null);
  const chatTypeRef = useRef<ChatType>("video");
  const localStreamRef = useRef<MediaStream | null>(null);
  const fileTransfersRef = useRef<Map<string, FileTransfer>>(new Map());

  // Messages are loaded per-room on join-success, not globally on mount

  // Handle remote stream
  const handleRemoteStream = useCallback(
    (stream: MediaStream, socketId: string) => {
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(socketId, stream);
        return newMap;
      });
    },
    [],
  );

  // Cleanup a file transfer entry
  const cleanupTransfer = useCallback((transferId: string) => {
    fileTransfersRef.current.delete(transferId);
    setFileTransferProgress((prev) => {
      const next = new Map(prev);
      next.delete(transferId);
      return next;
    });
  }, []);

  // Handle incoming chat message
  const handleDataChannelMessage = useCallback(
    async (message: DataChannelMessage, _socketId: string) => {
      try {
        if (message.type === "chat") {
          const chatMessage: ChatMessage = {
            id: message.payload.id,
            roomId: roomIdRef.current || "",
            senderId: message.payload.senderId,
            senderName: message.payload.senderName,
            content: message.payload.content,
            timestamp: message.payload.timestamp,
            type: "text",
          };
          await saveMessage(chatMessage);
          setMessages((prev) => [...prev, chatMessage]);
        } else if (message.type === "file-meta") {
          const {
            transferId,
            fileName,
            fileSize,
            mimeType,
            totalChunks,
            senderId,
            senderName,
          } = message.payload;

          // Reject files over the limit on the receiving side too
          if (fileSize > MAX_FILE_SIZE) {
            console.warn(
              `Rejected incoming file "${fileName}" — exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
            );
            return;
          }

          fileTransfersRef.current.set(transferId, {
            id: transferId,
            fileName,
            fileSize,
            mimeType,
            totalChunks,
            receivedChunks: new Map(),
            senderId,
            senderName,
          });
          setFileTransferProgress((prev) => {
            const next = new Map(prev);
            next.set(transferId, 0);
            return next;
          });
        } else if (message.type === "file-chunk") {
          const { transferId, chunkIndex, data } = message.payload;
          const transfer = fileTransfersRef.current.get(transferId);
          if (!transfer) return;

          transfer.receivedChunks.set(chunkIndex, data);
          const progress = Math.round(
            (transfer.receivedChunks.size / transfer.totalChunks) * 100,
          );
          setFileTransferProgress((prev) => {
            const next = new Map(prev);
            next.set(transferId, progress);
            return next;
          });

          // All chunks received — reassemble and create message
          if (transfer.receivedChunks.size === transfer.totalChunks) {
            try {
              const dataBase64 = reassembleChunks(
                transfer.receivedChunks,
                transfer.totalChunks,
              );
              const chatMessage: ChatMessage = {
                id: transferId,
                roomId: roomIdRef.current || "",
                senderId: transfer.senderId,
                senderName: transfer.senderName,
                content: transfer.fileName,
                timestamp: Date.now(),
                type: "file",
                file: {
                  name: transfer.fileName,
                  size: transfer.fileSize,
                  mimeType: transfer.mimeType,
                  dataBase64,
                },
              };
              await saveMessage(chatMessage);
              setMessages((prev) => [...prev, chatMessage]);
            } catch (err) {
              console.error("Failed to reassemble file:", err);
              setFileError(`Failed to receive file "${transfer.fileName}"`);
            } finally {
              cleanupTransfer(transferId);
            }
          }
        }
      } catch (err) {
        console.error("Error handling data channel message:", err);
      }
    },
    [cleanupTransfer],
  );

  // Create peer connection for a new user
  const createPeerForUser = useCallback(
    (
      socket: Socket,
      targetSocketId: string,
      targetUserId: string,
      targetUserName: string,
      stream: MediaStream | null,
      isInitiator: boolean,
    ): PeerConnection => {
      const peer = createPeerConnection(
        socket,
        targetSocketId,
        targetUserId,
        targetUserName,
        stream,
        handleRemoteStream,
        handleDataChannelMessage,
        isInitiator,
      );
      peerConnectionsRef.current.set(targetSocketId, peer);
      return peer;
    },
    [handleRemoteStream, handleDataChannelMessage],
  );

  // Join room
  const joinRoom = useCallback(
    async (roomId: string, name: string, type: ChatType = "video") => {
      try {
        setError(null);
        roomIdRef.current = roomId;
        chatTypeRef.current = type;
        setChatType(type);

        setMessages([]);

        // Get user media only for video chat (reuse existing stream if available)
        let stream: MediaStream | null = localStreamRef.current;
        if (type === "video" && !stream) {
          stream = await getUserMedia({ video: true, audio: true });
          setLocalStream(stream);
          localStreamRef.current = stream;
        }

        // Connect socket (reuses existing if available)
        const socket = connectSocket();
        socketRef.current = socket;

        // Remove any existing listeners before adding new ones
        socket.off("connect");
        socket.off("join-success");
        socket.off("join-error");
        socket.off("user-joined");
        socket.off("user-left");
        socket.off("offer");
        socket.off("answer");
        socket.off("ice-candidate");
        socket.off("room-closed");
        socket.off("room-stopped");
        socket.off("disconnect");

        // Socket event handlers
        socket.on("connect", () => {
          setIsConnected(true);
          socket.emit("join-room", { roomId, userName: name });
        });

        socket.on(
          "join-success",
          async ({
            userId: id,
            userName: uName,
            users: existingUsers,
            isAdmin: admin,
          }) => {
            setUserId(id);
            setUserName(uName);
            setIsJoined(true);
            setIsAdmin(admin || false);

            // Add system message
            const joinMsg: ChatMessage = {
              id: `system-${Date.now()}`,
              roomId,
              senderId: "system",
              senderName: "System",
              content: `You joined the room`,
              timestamp: Date.now(),
              type: "system",
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
                true,
              );
              await createOffer(peer, socket);
            }
            setUsers(userList);
          },
        );

        socket.on("join-error", ({ message }) => {
          setError(message);
          stopMediaStream(stream);
          setLocalStream(null);
          disconnectSocket();
        });

        socket.on(
          "user-joined",
          async ({ userId: uId, userName: uName, socketId }) => {
            // Add new user to list
            const newUser: User = { id: uId, name: uName, socketId };
            setUsers((prev) => [...prev, newUser]);

            // Add system message
            const joinMsg: ChatMessage = {
              id: `system-${Date.now()}`,
              roomId,
              senderId: "system",
              senderName: "System",
              content: `${uName} joined the room`,
              timestamp: Date.now(),
              type: "system",
            };
            await saveMessage(joinMsg);
            setMessages((prev) => [...prev, joinMsg]);

            // Create peer connection (will receive offer from new user)
            createPeerForUser(socket, socketId, uId, uName, stream, false);
          },
        );

        socket.on(
          "user-left",
          async ({ userId: uId, userName: uName, socketId }) => {
            // Remove user from list
            setUsers((prev) => prev.filter((u) => u.id !== uId));

            // Add system message
            const leaveMsg: ChatMessage = {
              id: `system-${Date.now()}`,
              roomId,
              senderId: "system",
              senderName: "System",
              content: `${uName} left the room`,
              timestamp: Date.now(),
              type: "system",
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
          },
        );

        socket.on(
          "offer",
          async ({ offer, senderSocketId, senderUserId, senderName }) => {
            let peer = peerConnectionsRef.current.get(senderSocketId);
            if (!peer) {
              peer = createPeerForUser(
                socket,
                senderSocketId,
                senderUserId,
                senderName,
                stream,
                false,
              );
            }
            await handleOffer(peer, offer, socket);
          },
        );

        socket.on("answer", async ({ answer, senderSocketId }) => {
          const peer = peerConnectionsRef.current.get(senderSocketId);
          if (peer) {
            await handleAnswer(peer, answer);
          }
        });

        socket.on("ice-candidate", async ({ candidate, senderSocketId }) => {
          const peer = peerConnectionsRef.current.get(senderSocketId);
          if (peer) {
            await handleIceCandidate(peer, candidate);
          }
        });

        socket.on("room-closed", async () => {
          await clearMessagesByRoomId(roomId);
          setMessages([]);
        });

        socket.on("room-stopped", async () => {
          setRoomStopped(true);
          setMessages([]);
        });

        socket.on("disconnect", () => {
          setIsConnected(false);
          setIsJoined(false);
        });

        // If already connected, emit join immediately (after all listeners are registered)
        if (socket.connected) {
          setIsConnected(true);
          socket.emit("join-room", { roomId, userName: name });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join room");
      }
    },
    [createPeerForUser],
  );

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

    // Clear messages for this room from IndexedDB
    if (roomIdRef.current) {
      await clearMessagesByRoomId(roomIdRef.current);
    }
    setMessages([]);

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit("leave-room");
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
      socketRef.current.emit("stop-room");
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || !userName) return;

      const chatMessage: ChatMessage = {
        id: `${userId}-${Date.now()}`,
        roomId: roomIdRef.current || "",
        senderId: userId,
        senderName: userName,
        content,
        timestamp: Date.now(),
        type: "text",
      };

      // Save locally
      await saveMessage(chatMessage);
      setMessages((prev) => [...prev, chatMessage]);

      // Send via data channels
      const dataMessage: DataChannelMessage = {
        type: "chat",
        payload: chatMessage,
      };

      peerConnectionsRef.current.forEach((peer) => {
        if (peer.dataChannel) {
          sendDataChannelMessage(peer.dataChannel, dataMessage);
        }
      });
    },
    [userId, userName],
  );

  // Send file
  const sendFileMessage = useCallback(
    async (file: File) => {
      if (!userId || !userName) return;

      if (file.size > MAX_FILE_SIZE) {
        setFileError(
          `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        );
        return;
      }

      try {
        setFileError(null);
        setFileSendProgress({ fileName: file.name, percent: 0 });

        // Check if any peers have open data channels
        const openChannels: {
          peer: PeerConnection;
          channel: RTCDataChannel;
        }[] = [];
        peerConnectionsRef.current.forEach((peer) => {
          if (peer.dataChannel && peer.dataChannel.readyState === "open") {
            openChannels.push({ peer, channel: peer.dataChannel });
          }
        });

        if (openChannels.length === 0) {
          setFileError("No connected peers to send file to");
          setFileSendProgress(null);
          return;
        }

        const fileData = await file.arrayBuffer();
        const dataBase64 = arrayBufferToBase64(fileData);

        // Send via data channels to all peers (use first channel for progress tracking)
        const transferPromises = openChannels.map(({ channel }, index) =>
          sendFile(
            channel,
            file,
            userId,
            userName,
            // Only track progress from the first channel to avoid flickering
            index === 0
              ? (percent) =>
                  setFileSendProgress({ fileName: file.name, percent })
              : undefined,
          ),
        );

        const results = await Promise.all(transferPromises);
        const { transferId, timestamp } = results[0];

        // Save locally
        const chatMessage: ChatMessage = {
          id: transferId,
          roomId: roomIdRef.current || "",
          senderId: userId,
          senderName: userName,
          content: file.name,
          timestamp,
          type: "file",
          file: {
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            dataBase64,
          },
        };
        await saveMessage(chatMessage);
        setMessages((prev) => [...prev, chatMessage]);
      } catch (err) {
        setFileError(
          err instanceof Error ? err.message : "Failed to send file",
        );
      } finally {
        setFileSendProgress(null);
      }
    },
    [userId, userName],
  );

  // Clear file error
  const clearFileError = useCallback(() => {
    setFileError(null);
  }, []);

  // Toggle video
  const toggleLocalVideo = useCallback(
    (enabled: boolean) => {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = enabled;
        });
      }
    },
    [localStream],
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
    [localStream],
  );

  // On mount: if no refresh flag in sessionStorage, this is a fresh session
  // (tab was closed previously) — clear stale IndexedDB data.
  // sessionStorage persists across refresh but is wiped on tab/browser close.
  useEffect(() => {
    if (!sessionStorage.getItem("iwc-page-active")) {
      // Fresh session (after tab close or first visit) — clear stale data
      clearAllMessages();
    }
  }, []);

  // Cleanup on page hide (fires on tab close, refresh, and navigation away)
  useEffect(() => {
    const handlePageHide = () => {
      // Mark that this is a refresh/navigation, not a tab close.
      // If the tab is actually closing, sessionStorage will be wiped anyway.
      sessionStorage.setItem("iwc-page-active", "1");

      peerConnectionsRef.current.forEach((peer) => {
        closePeerConnection(peer);
      });
      if (localStreamRef.current) {
        stopMediaStream(localStreamRef.current);
      }
      disconnectSocket();
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return {
    isConnected,
    isJoined,
    isAdmin,
    error,
    fileError,
    roomStopped,
    chatType,
    localStream,
    remoteStreams,
    messages,
    users,
    userId,
    userName,
    fileTransferProgress,
    fileSendProgress,
    joinRoom,
    leaveRoom,
    stopRoom,
    sendMessage,
    sendFileMessage,
    clearFileError,
    toggleLocalVideo,
    toggleLocalAudio,
  };
}
