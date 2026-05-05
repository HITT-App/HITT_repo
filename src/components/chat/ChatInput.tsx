import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Mic, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  onVoiceClick?: () => void;
  onImageSelect?: (file: File) => void;
  selectedImage?: string | null;
}

export function ChatInput({ 
  onSend, 
  isLoading, 
  disabled,
  onVoiceClick,
  onImageSelect,
  selectedImage
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      onSend(input, selectedImage || undefined);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter adds a newline — user taps Send button when ready
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setInput((v) => v + '\n');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSelect) {
      onImageSelect(file);
    }
    e.target.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <div className="flex items-center gap-1 bg-secondary/50 rounded-2xl border border-border/60 px-2">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-muted-foreground active:text-foreground transition-colors touch-manipulation"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={isLoading || disabled}
            className="flex-1 min-h-[48px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 px-1 text-[15px]"
            rows={1}
          />
          
          {/* Voice button */}
          {onVoiceClick && (
            <button
              type="button"
              onClick={onVoiceClick}
              className="p-2.5 text-muted-foreground active:text-foreground transition-colors touch-manipulation"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      <Button
        type="submit"
        size="icon"
        disabled={(!input.trim() && !selectedImage) || isLoading || disabled}
        className="h-12 w-12 rounded-xl flex-shrink-0"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </Button>
    </form>
  );
}
