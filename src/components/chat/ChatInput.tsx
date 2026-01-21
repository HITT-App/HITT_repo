import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Mic, Paperclip, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
        <div className="flex items-center gap-2 bg-secondary rounded-2xl border border-border px-3">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
            placeholder="Type to start chatting..."
            disabled={isLoading || disabled}
            className="flex-1 min-h-[48px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 px-0"
            rows={1}
          />
          
          {/* Voice button */}
          {onVoiceClick && (
            <button
              type="button"
              onClick={onVoiceClick}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
        className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
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
