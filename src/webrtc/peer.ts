import { Socket } from 'socket.io-client';
import type { PeerConnection } from '../types/room';
import { createDataChannel, setupDataChannelHandlers } from './dataChannel';
import type { DataChannelMessage } from './dataChannel';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function createPeerConnection(
  socket: Socket,
  targetSocketId: string,
  targetUserId: string,
  targetUserName: string,
  localStream: MediaStream | null,
  onRemoteStream: (stream: MediaStream, socketId: string) => void,
  onDataChannelMessage: (message: DataChannelMessage, socketId: string) => void,
  isInitiator: boolean = false
): PeerConnection {
  const connection = new RTCPeerConnection(ICE_SERVERS);

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      connection.addTrack(track, localStream);
    });
  }

  // Handle incoming remote stream
  connection.ontrack = (event) => {
    console.log('Received remote track from', targetUserName);
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0], targetSocketId);
    }
  };

  // Handle ICE candidates
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        targetSocketId,
        candidate: event.candidate,
      });
    }
  };

  connection.oniceconnectionstatechange = () => {
    console.log(`ICE connection state with ${targetUserName}:`, connection.iceConnectionState);
  };

  const peerConn: PeerConnection = {
    socketId: targetSocketId,
    userId: targetUserId,
    userName: targetUserName,
    connection,
  };

  // Create data channel if initiator
  if (isInitiator) {
    const dataChannel = createDataChannel(connection);
    setupDataChannelHandlers(
      dataChannel,
      (msg) => onDataChannelMessage(msg, targetSocketId)
    );
    peerConn.dataChannel = dataChannel;
  } else {
    // Wait for data channel from remote peer
    connection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      setupDataChannelHandlers(
        dataChannel,
        (msg) => onDataChannelMessage(msg, targetSocketId)
      );
      peerConn.dataChannel = dataChannel;
    };
  }

  return peerConn;
}

export async function createOffer(
  peerConnection: PeerConnection,
  socket: Socket
): Promise<void> {
  try {
    const offer = await peerConnection.connection.createOffer();
    await peerConnection.connection.setLocalDescription(offer);

    socket.emit('offer', {
      targetSocketId: peerConnection.socketId,
      offer,
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

export async function handleOffer(
  peerConnection: PeerConnection,
  offer: RTCSessionDescriptionInit,
  socket: Socket
): Promise<void> {
  try {
    await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.connection.createAnswer();
    await peerConnection.connection.setLocalDescription(answer);

    socket.emit('answer', {
      targetSocketId: peerConnection.socketId,
      answer,
    });
  } catch (error) {
    console.error('Error handling offer:', error);
    throw error;
  }
}

export async function handleAnswer(
  peerConnection: PeerConnection,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  try {
    await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('Error handling answer:', error);
    throw error;
  }
}

export async function handleIceCandidate(
  peerConnection: PeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await peerConnection.connection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

export function closePeerConnection(peerConnection: PeerConnection): void {
  if (peerConnection.dataChannel) {
    peerConnection.dataChannel.close();
  }
  peerConnection.connection.close();
}
