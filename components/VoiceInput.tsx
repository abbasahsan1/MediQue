import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (transcript) {
      onChange(transcript);
    }
  }, [transcript, onChange]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
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
        <p className="text-xs text-primary mt-1 animate-pulse">Listening... speak now</p>
      )}
    </div>
  );
};
