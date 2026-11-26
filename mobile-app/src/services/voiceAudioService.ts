import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// In-memory reference for currently playing sound object
let activeSound: Audio.Sound | null = null;
let activeSoundMsgId: string | null = null;

// Cached fallback audio file URI
let fallbackAudioFileUri: string | null = null;

/**
 * Pure JavaScript Base64 encoder for Uint8Array (no Node Buffer needed)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    base64 += chars[b0 >> 2];
    base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return base64;
}

/**
 * Generate a clean 4-second WAV chime file to serve as a reliable fallback audio
 * for existing text voice-note messages or offline playback.
 */
export async function getFallbackAudioUri(): Promise<string> {
  if (fallbackAudioFileUri) {
    try {
      const info = await FileSystem.getInfoAsync(fallbackAudioFileUri);
      if (info.exists) return fallbackAudioFileUri;
    } catch {}
  }

  try {
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const targetPath = `${dir}gymora_voice_chime.wav`;
    const info = await FileSystem.getInfoAsync(targetPath);
    if (info.exists) {
      fallbackAudioFileUri = targetPath;
      return targetPath;
    }

    // Generate 4-second PCM WAV audio data in base64
    const sampleRate = 8000;
    const durationSec = 4;
    const totalSamples = sampleRate * durationSec;
    const headerLen = 44;
    const totalLen = headerLen + totalSamples;
    const bytes = new Uint8Array(totalLen);

    // RIFF chunk
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // "RIFF"
    const fileSize = totalLen - 8;
    bytes[4] = fileSize & 0xff;
    bytes[5] = (fileSize >> 8) & 0xff;
    bytes[6] = (fileSize >> 16) & 0xff;
    bytes[7] = (fileSize >> 24) & 0xff;
    bytes[8] = 0x57; bytes[9] = 0x41; bytes[10] = 0x56; bytes[11] = 0x45; // "WAVE"

    // fmt subchunk
    bytes[12] = 0x66; bytes[13] = 0x6d; bytes[14] = 0x74; bytes[15] = 0x20; // "fmt "
    bytes[16] = 16; bytes[17] = 0; bytes[18] = 0; bytes[19] = 0; // Subchunk1Size = 16
    bytes[20] = 1; bytes[21] = 0; // AudioFormat = 1 (PCM)
    bytes[22] = 1; bytes[23] = 0; // NumChannels = 1 (mono)
    bytes[24] = sampleRate & 0xff;
    bytes[25] = (sampleRate >> 8) & 0xff;
    bytes[26] = (sampleRate >> 16) & 0xff;
    bytes[27] = (sampleRate >> 24) & 0xff; // SampleRate
    bytes[28] = sampleRate & 0xff;
    bytes[29] = (sampleRate >> 8) & 0xff;
    bytes[30] = (sampleRate >> 16) & 0xff;
    bytes[31] = (sampleRate >> 24) & 0xff; // ByteRate
    bytes[32] = 1; bytes[33] = 0; // BlockAlign = 1
    bytes[34] = 8; bytes[35] = 0; // BitsPerSample = 8

    // data subchunk
    bytes[36] = 0x64; bytes[37] = 0x61; bytes[38] = 0x74; bytes[39] = 0x61; // "data"
    bytes[40] = totalSamples & 0xff;
    bytes[41] = (totalSamples >> 8) & 0xff;
    bytes[42] = (totalSamples >> 16) & 0xff;
    bytes[43] = (totalSamples >> 24) & 0xff;

    // Generate melodic notes (D5, E5, G5, A5) with pleasant decay
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const f = t < 1.0 ? 587.33 : t < 2.0 ? 659.25 : t < 3.0 ? 783.99 : 880.00;
      const decay = Math.exp(-2.0 * (t % 1.0));
      const s = Math.sin(2 * Math.PI * f * t) * decay;
      bytes[headerLen + i] = Math.floor(128 + 90 * s);
    }

    const base64Data = uint8ArrayToBase64(bytes);

    await FileSystem.writeAsStringAsync(targetPath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    fallbackAudioFileUri = targetPath;
    return targetPath;
  } catch (err) {
    console.warn('[voiceAudioService] Could not write fallback audio file:', err);
    return 'https://actions.google.com/sounds/v1/communication/voice_mail.ogg';
  }
}

/**
 * Stop any actively playing sound
 */
export async function stopVoicePlayback(): Promise<void> {
  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch {}
    activeSound = null;
    activeSoundMsgId = null;
  }
}

/**
 * Returns currently playing message ID or null
 */
export function getActivePlayingVoiceMsgId(): string | null {
  return activeSoundMsgId;
}

/**
 * Play voice note audio for a given message ID with progress callbacks
 */
export async function playVoiceNote(
  msgId: string,
  rawAudioUri?: string,
  onProgress?: (seconds: number) => void,
  onFinish?: () => void
): Promise<boolean> {
  // If this message is already playing, stop it
  if (activeSoundMsgId === msgId && activeSound) {
    await stopVoicePlayback();
    onFinish?.();
    return false;
  }

  // Stop any other message currently playing
  await stopVoicePlayback();

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    let uriToPlay = rawAudioUri;
    if (!uriToPlay || (!uriToPlay.startsWith('http') && !uriToPlay.startsWith('file:') && !uriToPlay.startsWith('data:'))) {
      uriToPlay = await getFallbackAudioUri();
    }

    activeSoundMsgId = msgId;

    const { sound } = await Audio.Sound.createAsync(
      { uri: uriToPlay },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) {
          if (status.error) {
            console.warn('[voiceAudioService] Playback error:', status.error);
            activeSoundMsgId = null;
            activeSound = null;
            onFinish?.();
          }
          return;
        }

        if (status.isPlaying) {
          const currentSec = Math.floor((status.positionMillis || 0) / 1000);
          onProgress?.(currentSec);
        }

        if (status.didJustFinish) {
          activeSoundMsgId = null;
          activeSound = null;
          sound.unloadAsync().catch(() => {});
          onFinish?.();
        }
      }
    );

    activeSound = sound;
    return true;
  } catch (err) {
    console.warn('[voiceAudioService] Direct sound playback failed, attempting fallback sound:', err);
    try {
      const fallback = await getFallbackAudioUri();
      activeSoundMsgId = msgId;
      const { sound } = await Audio.Sound.createAsync(
        { uri: fallback },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) {
            if (status.error) {
              activeSoundMsgId = null;
              activeSound = null;
              onFinish?.();
            }
            return;
          }
          if (status.isPlaying) {
            const currentSec = Math.floor((status.positionMillis || 0) / 1000);
            onProgress?.(currentSec);
          }
          if (status.didJustFinish) {
            activeSoundMsgId = null;
            activeSound = null;
            sound.unloadAsync().catch(() => {});
            onFinish?.();
          }
        }
      );
      activeSound = sound;
      return true;
    } catch (fallbackErr) {
      console.warn('[voiceAudioService] Fallback playback also failed:', fallbackErr);
      activeSoundMsgId = null;
      activeSound = null;
      onFinish?.();
      return false;
    }
  }
}

/**
 * Start microphone voice recording
 */
export async function startVoiceRecording(): Promise<Audio.Recording | null> {
  try {
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      return null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    return recording;
  } catch (err) {
    console.warn('[voiceAudioService] Failed to start voice recording:', err);
    return null;
  }
}

/**
 * Stop microphone voice recording and return recorded URI
 */
export async function stopVoiceRecording(recording: Audio.Recording): Promise<string | null> {
  try {
    await recording.stopAndUnloadAsync();
    return recording.getURI();
  } catch (err) {
    console.warn('[voiceAudioService] Failed to stop recording:', err);
    return null;
  }
}

/**
 * Check if a message represents a voice note
 */
export function isVoiceNoteMessage(msg: {
  text?: string;
  message?: string;
  type?: string;
  messageType?: string;
  attachment?: { type?: string; name?: string; uri?: string };
  attachments?: Array<{ fileType?: string; fileName?: string; url?: string }>;
}): boolean {
  const text = (msg.text || msg.message || '').toLowerCase();
  const type = (msg.type || msg.messageType || '').toLowerCase();
  const attType = (msg.attachment?.type || (msg.attachments && msg.attachments[0]?.fileType) || '').toLowerCase();
  const attName = (msg.attachment?.name || (msg.attachments && msg.attachments[0]?.fileName) || '').toLowerCase();

  return (
    type === 'voice' ||
    attType === 'audio' ||
    text.includes('voice note') ||
    text.includes('voice message') ||
    text.includes('🎙️') ||
    attName.startsWith('voice_')
  );
}

/**
 * Extract voice duration in seconds from message object or text pattern
 */
export function extractVoiceDuration(msg: {
  duration?: number;
  text?: string;
  message?: string;
  attachment?: { duration?: number };
  attachments?: Array<{ duration?: number }>;
}): number {
  if (typeof msg.duration === 'number' && msg.duration > 0) return msg.duration;
  if (msg.attachment?.duration && msg.attachment.duration > 0) return msg.attachment.duration;
  if (msg.attachments && msg.attachments[0]?.duration && msg.attachments[0].duration > 0) {
    return msg.attachments[0].duration;
  }

  const text = msg.text || msg.message || '';
  const matchSec = text.match(/(\d+)\s*s/i);
  if (matchSec && matchSec[1]) {
    const s = parseInt(matchSec[1], 10);
    if (!isNaN(s) && s > 0) return s;
  }

  const matchMinSec = text.match(/(\d+):(\d+)/);
  if (matchMinSec && matchMinSec[1] && matchMinSec[2]) {
    const s = parseInt(matchMinSec[1], 10) * 60 + parseInt(matchMinSec[2], 10);
    if (!isNaN(s) && s > 0) return s;
  }

  return 4; // Standard default 4s voice note
}
