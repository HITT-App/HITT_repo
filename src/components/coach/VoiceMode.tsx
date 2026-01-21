import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Check, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceModeProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
}

export function VoiceMode({ onTranscript, onClose }: VoiceModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [transcript, setTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      // Start visualization
      const updateVisualization = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(Array.from(dataArray.slice(0, 32)));
        }
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      };
      updateVisualization();

      // Set up speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setTranscript(prev => prev + transcript + ' ');
            } else {
              interimTranscript += transcript;
            }
          }
        };

        recognition.start();
        (window as any).currentRecognition = recognition;
      }

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      if ((window as any).currentRecognition) {
        (window as any).currentRecognition.stop();
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsRecording(false);
  }, [isRecording]);

  const handleConfirm = () => {
    stopRecording();
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }
    onClose();
  };

  const handleCancel = () => {
    stopRecording();
    setTranscript('');
    onClose();
  };

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="absolute top-4 right-4">
        <Button 
          variant="outline" 
          size="sm"
          className="rounded-full border-primary text-primary"
        >
          Voice Mode
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Shout anything to<br />coach sandow!
        </h1>
        
        {transcript && (
          <p className="text-xl text-foreground mb-8 max-w-xs">
            {transcript}
          </p>
        )}

        {!transcript && (
          <p className="text-muted-foreground mb-8">Ready?</p>
        )}
      </div>

      {/* Audio visualization */}
      <div className="w-full max-w-md h-16 flex items-center justify-center gap-0.5 mb-8">
        {audioData.map((value, i) => (
          <div
            key={i}
            className="w-1 bg-primary rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, (value / 255) * 64)}px` }}
          />
        ))}
        {audioData.length === 0 && (
          Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-4 bg-muted rounded-full"
            />
          ))
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mb-8">
        <Button
          variant="ghost"
          size="icon"
          className="w-14 h-14 rounded-full border-2 border-muted-foreground text-muted-foreground"
          onClick={handleCancel}
        >
          <X className="w-6 h-6" />
        </Button>

        <Button
          size="icon"
          className={cn(
            "w-20 h-20 rounded-full",
            isRecording ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-destructive-foreground" />
          ) : (
            <Mic className="w-8 h-8 text-primary-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-14 h-14 rounded-full border-2 border-primary text-primary"
          onClick={handleConfirm}
        >
          <Check className="w-6 h-6" />
        </Button>
      </div>

      {/* Timer */}
      <span className="text-muted-foreground">{formatDuration(duration)}</span>
    </div>
  );
}
