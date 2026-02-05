export interface MediaConstraints {
  video: boolean;
  audio: boolean;
}

export async function getUserMedia(
  constraints: MediaConstraints = { video: true, audio: true }
): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints.video ? {
        width: { ideal: 640 },
        height: { ideal: 480 }
      } : false,
      audio: constraints.audio ? {
        echoCancellation: true,
        noiseSuppression: true,
      } : false,
    });
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw error;
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

export function toggleVideo(stream: MediaStream | null, enabled: boolean): void {
  if (stream) {
    stream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
}

export function toggleAudio(stream: MediaStream | null, enabled: boolean): void {
  if (stream) {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
}
