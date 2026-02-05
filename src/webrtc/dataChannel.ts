export type DataChannelMessage = {
  type: 'chat';
  payload: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
  };
}

export function createDataChannel(
  peerConnection: RTCPeerConnection,
  label: string = 'chat'
): RTCDataChannel {
  const dataChannel = peerConnection.createDataChannel(label, {
    ordered: true,
  });
  return dataChannel;
}

export function setupDataChannelHandlers(
  dataChannel: RTCDataChannel,
  onMessage: (message: DataChannelMessage) => void,
  onOpen?: () => void,
  onClose?: () => void
): void {
  dataChannel.onopen = () => {
    console.log('Data channel opened');
    onOpen?.();
  };

  dataChannel.onclose = () => {
    console.log('Data channel closed');
    onClose?.();
  };

  dataChannel.onerror = (error) => {
    console.error('Data channel error:', error);
  };

  dataChannel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as DataChannelMessage;
      onMessage(message);
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  };
}

export function sendDataChannelMessage(
  dataChannel: RTCDataChannel,
  message: DataChannelMessage
): boolean {
  if (dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(message));
    return true;
  }
  return false;
}
