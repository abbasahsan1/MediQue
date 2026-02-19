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

  // Track the last transcript we synced so we only push genuinely new transcripts
  const lastSyncedRef = useRef('');

  useEffect(() => {
    if (transcript && transcript !== lastSyncedRef.current) {
      lastSyncedRef.current = transcript;
      onChangeRef.current(transcript);
    }
  }, [transcript]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
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
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
          style={{ minHeight: 88 }}
        />
      ) : (
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
        <div className="flex items-center gap-2 mt-2">
          <div className="voice-bars">
            <div className="voice-bar" />
            <div className="voice-bar" />
            <div className="voice-bar" />
            <div className="voice-bar" />
            <div className="voice-bar" />
          </div>
          <span className="text-xs text-primary">Listening... speak now</span>
        </div>
      )}
    </div>
  );
};
