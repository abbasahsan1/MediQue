import { useCallback, useEffect, useRef, useState } from 'react';

const DEEPGRAM_KEY = (import.meta.env.VITE_DEEPGRAM_KEY as string | undefined)?.trim();
const RIVA_WS_URL = import.meta.env.VITE_TRANSCRIPTION_WS_URL as string | undefined;

export interface UseVoiceInputReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/* ── AudioWorklet for PCM16 capture ─────────────────── */

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

/* ── Base64 helper for Riva fallback ────────────────── */

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/* ── Deepgram connection ────────────────────────────── */

function connectDeepgram(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: () => void,
  onOpen: () => void,
): WebSocket {
  const params = new URLSearchParams({
    model: 'nova-2',
    language: 'en',
    smart_format: 'true',
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
    interim_results: 'true',
    utterance_end_ms: '1500',
    vad_events: 'true',
  });

  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params.toString()}`,
    ['token', DEEPGRAM_KEY!],
  );

  ws.onopen = onOpen;

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.type === 'Results') {
        const alt = data.channel?.alternatives?.[0];
        if (alt?.transcript) {
          onTranscript(alt.transcript, data.is_final === true);
        }
      }
    } catch {
      // Non-JSON — ignore
    }
  };

  ws.onerror = onError;

  return ws;
}

/* ── Riva fallback connection ───────────────────────── */

const COMMIT_INTERVAL_MS = 2000;

function connectRiva(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: () => void,
  onOpen: () => void,
): { ws: WebSocket; sendAudio: (pcm: ArrayBuffer) => void; commitTimer: ReturnType<typeof setInterval> | null } {
  const ws = new WebSocket(RIVA_WS_URL!);
  let hasAudioSinceCommit = false;
  let commitTimer: ReturnType<typeof setInterval> | null = null;

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

    commitTimer = setInterval(() => {
      if (hasAudioSinceCommit && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        hasAudioSinceCommit = false;
      }
    }, COMMIT_INTERVAL_MS);

    onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      const eventType = data.type as string;
      if (eventType === 'conversation.item.input_audio_transcription.completed') {
        const completed = (data.transcript as string) ?? '';
        if (completed.trim()) onTranscript(completed.trim(), true);
      } else if (eventType === 'conversation.item.input_audio_transcription.delta') {
        const delta = (data.delta as string) ?? '';
        if (delta.trim()) onTranscript(delta.trim(), false);
      }
    } catch {
      // ignore
    }
  };

  ws.onerror = onError;

  const sendAudio = (pcm: ArrayBuffer) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: encodeBase64(pcm),
      }));
      hasAudioSinceCommit = true;
    }
  };

  return { ws, sendAudio, commitTimer };
}

/* ── Hook ───────────────────────────────────────────── */

export function useVoiceInput(): UseVoiceInputReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizedRef = useRef('');
  const backendRef = useRef<'deepgram' | 'riva' | null>(null);
  const rivaSendRef = useRef<((pcm: ArrayBuffer) => void) | null>(null);
  const isStoppingRef = useRef(false);

  const hasDeepgram = !!DEEPGRAM_KEY;
  const hasRiva = !!RIVA_WS_URL;
  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioContext !== 'undefined' &&
    typeof AudioWorkletNode !== 'undefined' &&
    (hasDeepgram || hasRiva);

  const cleanup = useCallback(() => {
    isStoppingRef.current = true;

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
          if (backendRef.current === 'deepgram') {
            // Send empty buffer to signal end of audio
            wsRef.current.send(new Uint8Array(0));
          } else {
            wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
            wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.done' }));
          }
        }
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          const ws = wsRef.current;
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              ws.close(1000, 'Session ended');
            }
          }, 500);
        }
      } catch {
        // Ignore cleanup errors
      }
      wsRef.current = null;
    }

    rivaSendRef.current = null;
    backendRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Voice input is not available. Please type your response.');
      return;
    }

    setError(null);
    finalizedRef.current = '';
    isStoppingRef.current = false;

    try {
      // Get microphone access
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

      // Transcript handler — shared between Deepgram and Riva
      const handleTranscript = (text: string, isFinal: boolean) => {
        setError(null);
        if (isFinal) {
          finalizedRef.current = finalizedRef.current
            ? `${finalizedRef.current} ${text}`
            : text;
          setTranscript(finalizedRef.current);
        } else {
          setTranscript(
            finalizedRef.current ? `${finalizedRef.current} ${text}` : text,
          );
        }
      };

      const handleReady = () => {
        setIsListening(true);
      };

      // Try Deepgram first (wss:// works on Vercel), fall back to Riva
      if (hasDeepgram) {
        backendRef.current = 'deepgram';
        const pendingChunks: ArrayBuffer[] = [];
        let wsReady = false;

        const ws = connectDeepgram(
          handleTranscript,
          () => {
            // Deepgram failed — try Riva fallback
            console.warn('[VoiceInput] Deepgram failed, trying Riva fallback...');
            if (hasRiva) {
              backendRef.current = 'riva';
              const riva = connectRiva(
                handleTranscript,
                () => {
                  setError('Voice connection error. Please type your response instead.');
                  cleanup();
                },
                handleReady,
              );
              wsRef.current = riva.ws;
              rivaSendRef.current = riva.sendAudio;
              commitTimerRef.current = riva.commitTimer;

              // Redirect audio stream to Riva
              workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
                rivaSendRef.current?.(event.data);
              };
            } else {
              setError('Voice connection error. Please type your response instead.');
              cleanup();
            }
          },
          () => {
            wsReady = true;
            // Flush pending chunks as binary
            for (const chunk of pendingChunks) {
              ws.send(chunk);
            }
            pendingChunks.length = 0;
            handleReady();
          },
        );

        wsRef.current = ws;

        ws.onclose = (event) => {
          if (!isStoppingRef.current && event.code !== 1000) {
            setError('Voice connection closed unexpectedly. Please type your response.');
          }
          setIsListening(false);
        };

        // Deepgram receives raw binary PCM16
        workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (wsReady && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          } else {
            pendingChunks.push(event.data);
          }
        };
      } else if (hasRiva) {
        // Riva only
        backendRef.current = 'riva';
        const riva = connectRiva(
          handleTranscript,
          () => {
            setError('Voice connection error. Please type your response instead.');
            cleanup();
          },
          handleReady,
        );
        wsRef.current = riva.ws;
        rivaSendRef.current = riva.sendAudio;
        commitTimerRef.current = riva.commitTimer;

        riva.ws.onclose = (event) => {
          if (commitTimerRef.current) {
            clearInterval(commitTimerRef.current);
            commitTimerRef.current = null;
          }
          if (!isStoppingRef.current && event.code !== 1000) {
            setError('Voice connection closed unexpectedly. Please type your response.');
          }
          setIsListening(false);
        };

        workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          rivaSendRef.current?.(event.data);
        };
      }

      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access or type your response.');
      } else {
        setError('Could not start voice input. Please type your response.');
      }
      cleanup();
    }
  }, [isSupported, hasDeepgram, hasRiva, cleanup]);

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
