import { useCallback, useEffect, useRef, useState } from 'react';

const TRANSCRIPTION_WS_URL = import.meta.env.VITE_TRANSCRIPTION_WS_URL as string | undefined;

export interface UseVoiceInputReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * PCM16 audio capture via AudioWorklet + NVIDIA Riva NIM Realtime ASR.
 *
 * Protocol (discovered by probing the server):
 *   1. Connect WebSocket to /v1/realtime?intent=transcription
 *   2. On open: send `transcription_session.update` with model + PCM16 config
 *   3. Stream audio via `input_audio_buffer.append` (base64-encoded PCM16)
 *   4. Periodically send `input_audio_buffer.commit` to trigger transcription
 *   5. Receive `conversation.item.input_audio_transcription.completed` with transcript
 *   6. On stop: send final commit + `input_audio_buffer.done`, then close
 *
 * Key details:
 *   - Model must be `parakeet-1.1b-en-US-asr-streaming-throughput` (not "conformer")
 *   - Audio is NOT processed until `input_audio_buffer.commit` is sent
 *   - Each commit processes all audio buffered since the previous commit
 */

/** Interval (ms) between automatic commits while streaming */
const COMMIT_INTERVAL_MS = 2000;

const WORKLET_PROCESSOR_CODE = `
class Pcm16Processor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;
    const pcm16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true;
  }
}
registerProcessor('pcm16-processor', Pcm16Processor);
`;

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let workletRegistered = false;
let workletBlobUrl: string | null = null;

async function ensureWorklet(ctx: AudioContext): Promise<void> {
  if (workletRegistered) return;
  if (!workletBlobUrl) {
    const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
    workletBlobUrl = URL.createObjectURL(blob);
  }
  await ctx.audioWorklet.addModule(workletBlobUrl);
  workletRegistered = true;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAudioSinceCommitRef = useRef(false);
  const finalizedRef = useRef('');

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioContext !== 'undefined' &&
    typeof AudioWorkletNode !== 'undefined' &&
    !!TRANSCRIPTION_WS_URL;

  const cleanup = useCallback(() => {
    if (commitTimerRef.current) {
      clearInterval(commitTimerRef.current);
      commitTimerRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      workletRegistered = false;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          // Final commit to flush any remaining audio, then done
          if (hasAudioSinceCommitRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          }
          wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.done' }));
        }
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          // Delay close slightly to let final commit process
          const ws = wsRef.current;
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              ws.close(1000, 'Session ended');
            }
          }, 1000);
        }
      } catch {
        // Ignore cleanup errors
      }
      wsRef.current = null;
    }

    hasAudioSinceCommitRef.current = false;
    setIsListening(false);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startListening = useCallback(async () => {
    if (!isSupported || !TRANSCRIPTION_WS_URL) {
      setError('Voice input is not available. Please type your response.');
      return;
    }

    setError(null);
    finalizedRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      await ensureWorklet(audioCtx);

      const source = audioCtx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioCtx, 'pcm16-processor');
      workletNodeRef.current = workletNode;

      const ws = new WebSocket(TRANSCRIPTION_WS_URL);
      wsRef.current = ws;

      const pendingChunks: ArrayBuffer[] = [];
      let wsReady = false;

      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const pcmBuffer = event.data;
        if (wsReady && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodeBase64(pcmBuffer),
          }));
          hasAudioSinceCommitRef.current = true;
        } else {
          pendingChunks.push(pcmBuffer);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'transcription_session.update',
          session: {
            modalities: ['text'],
            input_audio_format: 'pcm16',
            input_audio_transcription: {
              language: 'en-US',
              model: 'parakeet-1.1b-en-US-asr-streaming-throughput',
            },
            input_audio_params: {
              sample_rate_hz: 16000,
              num_channels: 1,
            },
          },
        }));

        wsReady = true;
        setIsListening(true);

        // Flush pending chunks
        for (const chunk of pendingChunks) {
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodeBase64(chunk),
          }));
          hasAudioSinceCommitRef.current = true;
        }
        pendingChunks.length = 0;

        // Periodically commit buffered audio to trigger transcription
        commitTimerRef.current = setInterval(() => {
          if (hasAudioSinceCommitRef.current && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
            hasAudioSinceCommitRef.current = false;
          }
        }, COMMIT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          const eventType = data.type as string;

          if (eventType === 'conversation.item.input_audio_transcription.completed') {
            const completed = (data.transcript as string) ?? '';
            if (completed.trim()) {
              finalizedRef.current = finalizedRef.current
                ? `${finalizedRef.current} ${completed.trim()}`
                : completed.trim();
              setTranscript(finalizedRef.current);
            }
          } else if (eventType === 'conversation.item.input_audio_transcription.delta') {
            const delta = (data.delta as string) ?? '';
            if (delta.trim()) {
              // Show partial alongside finalized text
              setTranscript(
                finalizedRef.current ? `${finalizedRef.current} ${delta.trim()}` : delta.trim(),
              );
            }
          } else if (eventType === 'error') {
            const msg = data.error?.message ?? 'Unknown error';
            console.warn('[VoiceInput] Server error:', msg);
          }
        } catch {
          // Non-JSON — ignore
        }
      };

      ws.onerror = () => {
        setError('Voice connection error. Please type your response instead.');
        cleanup();
      };

      ws.onclose = (event) => {
        if (commitTimerRef.current) {
          clearInterval(commitTimerRef.current);
          commitTimerRef.current = null;
        }
        if (event.code !== 1000) {
          setError('Voice connection closed unexpectedly. Please type your response.');
        }
        setIsListening(false);
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access or type your response.');
      } else {
        setError('Could not start voice input. Please type your response.');
      }
      cleanup();
    }
  }, [isSupported, cleanup]);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    finalizedRef.current = '';
    setError(null);
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening: () => void startListening(),
    stopListening,
    resetTranscript,
  };
}
