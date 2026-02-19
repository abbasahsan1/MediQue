import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  inputType?: 'text' | 'number';
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  inputType = 'text',
}) => {
  const { transcript, isListening, isSupported, error, startListening, stopListening, resetTranscript } = useVoiceInput();

  // Stable ref for onChange to avoid re-syncing when the callback reference changes
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const sessionBaseRef = useRef(value);
  const hasAutoStartedRef = useRef(false);
  const lastSyncedRef = useRef('');
  const lastVoiceOutputRef = useRef('');

  const combineText = (base: string, next: string) => {
    if (!base) return next;
    if (!next) return base;
    return `${base.trim()} ${next.trim()}`;
  };

  useEffect(() => {
    if (!transcript || transcript === lastSyncedRef.current) return;

    lastSyncedRef.current = transcript;
    const merged = combineText(sessionBaseRef.current, transcript);
    lastVoiceOutputRef.current = merged;
    onChangeRef.current(merged);
  }, [transcript]);

  useEffect(() => {
    if (!isSupported || isListening || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    sessionBaseRef.current = value;
    lastSyncedRef.current = '';
    resetTranscript();
    startListening();
  }, [isListening, isSupported, resetTranscript, startListening, value]);

  useEffect(() => {
    if (!isListening) return;
    if (value === lastVoiceOutputRef.current) return;

    sessionBaseRef.current = value;
    lastSyncedRef.current = '';
    resetTranscript();
  }, [isListening, resetTranscript, value]);

  const handleInputChange = (nextValue: string) => {
    sessionBaseRef.current = nextValue;
    lastVoiceOutputRef.current = nextValue;
    onChangeRef.current(nextValue);

    if (isListening) {
      lastSyncedRef.current = '';
      resetTranscript();
    }
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      sessionBaseRef.current = value;
      lastSyncedRef.current = '';
      resetTranscript();
      startListening();
    }
  };

  const inputClasses = `input-field text-sm pr-12 ${isListening ? 'border-primary ring-2 ring-primary/20' : ''}`;

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
          style={{ minHeight: 88 }}
        />
      ) : (
        <input
          type={inputType}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
          {...(inputType === 'number' ? { min: 0, max: 120 } : {})}
        />
      )}

      {isSupported && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
          className={`absolute right-2 top-2 p-1.5 rounded-md transition-colors ${
            isListening
              ? 'bg-primary text-primary-foreground animate-pulse'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-muted'
          }`}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive mt-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {isListening && (
        <div className="mt-3 rounded-lg border border-primary/35 bg-primary/10 p-4">
          <div className="flex items-center justify-center mb-3">
            <div className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <Mic size={24} className="relative z-10" />
            </div>
          </div>
          <div className="voice-bars justify-center h-8 mb-1">
            <div className="voice-bar !w-1 !h-5" />
            <div className="voice-bar !w-1 !h-5" />
            <div className="voice-bar !w-1 !h-5" />
            <div className="voice-bar !w-1 !h-5" />
            <div className="voice-bar !w-1 !h-5" />
          </div>
          <p className="text-xs text-primary text-center font-semibold">Listening... speak now</p>
        </div>
      )}
    </div>
  );
};
