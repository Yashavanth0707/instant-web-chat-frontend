export type DataChannelMessage =
  | {
      type: 'chat';
      payload: {
        id: string;
        senderId: string;
        senderName: string;
        content: string;
        timestamp: number;
      };
    }
  | {
      type: 'file-meta';
      payload: {
        transferId: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        totalChunks: number;
        senderId: string;
        senderName: string;
        timestamp: number;
      };
    }
  | {
      type: 'file-chunk';
      payload: {
        transferId: string;
        chunkIndex: number;
        data: string; // base64 encoded chunk
      };
    };

// ~16KB per chunk (safe for RTCDataChannel)
export const FILE_CHUNK_SIZE = 16 * 1024;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

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

/** Convert ArrayBuffer to base64 string */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert base64 string to ArrayBuffer */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Split a file into base64-encoded chunks */
export function splitFileIntoChunks(data: ArrayBuffer): string[] {
  const chunks: string[] = [];
  const bytes = new Uint8Array(data);
  for (let offset = 0; offset < bytes.byteLength; offset += FILE_CHUNK_SIZE) {
    const slice = bytes.slice(offset, offset + FILE_CHUNK_SIZE);
    chunks.push(arrayBufferToBase64(slice.buffer));
  }
  return chunks;
}

/** Reassemble base64-encoded chunks into a single base64 string */
export function reassembleChunks(chunks: Map<number, string>, totalChunks: number): string {
  const allBytes: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkBase64 = chunks.get(i);
    if (!chunkBase64) throw new Error(`Missing chunk ${i}`);
    const binary = atob(chunkBase64);
    for (let j = 0; j < binary.length; j++) {
      allBytes.push(binary.charCodeAt(j));
    }
  }
  // Convert back to base64 for storage
  const uint8 = new Uint8Array(allBytes);
  let binaryStr = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binaryStr += String.fromCharCode(uint8[i]);
  }
  return btoa(binaryStr);
}

/** Wait for data channel buffer to drain, with timeout */
async function waitForBufferDrain(
  dataChannel: RTCDataChannel,
  timeoutMs: number = 30000
): Promise<void> {
  const start = Date.now();
  while (dataChannel.bufferedAmount > 64 * 1024) {
    if (dataChannel.readyState !== 'open') {
      throw new Error('Data channel closed during file transfer');
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('File transfer timed out — connection too slow');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Send a file over the data channel with chunking */
export async function sendFile(
  dataChannel: RTCDataChannel,
  file: File,
  senderId: string,
  senderName: string,
  onProgress?: (percent: number) => void
): Promise<{ transferId: string; timestamp: number }> {
  if (dataChannel.readyState !== 'open') {
    throw new Error('Cannot send file — data channel is not open');
  }

  const transferId = `file-${senderId}-${Date.now()}`;
  const timestamp = Date.now();

  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    throw new Error('Failed to read file');
  }

  const chunks = splitFileIntoChunks(data);
  onProgress?.(0);

  // Send metadata first
  const metaMessage: DataChannelMessage = {
    type: 'file-meta',
    payload: {
      transferId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks: chunks.length,
      senderId,
      senderName,
      timestamp,
    },
  };

  if (!sendDataChannelMessage(dataChannel, metaMessage)) {
    throw new Error('Failed to send file metadata — channel not open');
  }

  // Send chunks with backpressure handling
  for (let i = 0; i < chunks.length; i++) {
    await waitForBufferDrain(dataChannel);

    const chunkMessage: DataChannelMessage = {
      type: 'file-chunk',
      payload: {
        transferId,
        chunkIndex: i,
        data: chunks[i],
      },
    };

    if (!sendDataChannelMessage(dataChannel, chunkMessage)) {
      throw new Error(`File transfer failed at chunk ${i + 1}/${chunks.length}`);
    }

    onProgress?.(Math.round(((i + 1) / chunks.length) * 100));
  }

  return { transferId, timestamp };
}
