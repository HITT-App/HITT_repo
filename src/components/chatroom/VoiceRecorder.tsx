import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  onRecordComplete: (blob: Blob) => void;
  recording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function VoiceRecorder({
  onRecordComplete,
  recording,
  onStartRecording,
  onStopRecording,
}: VoiceRecorderProps) {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
        setDuration(0);
      };

      mediaRecorder.start();
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      onStartRecording();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onStopRecording();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (recording) {
    return (
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2 flex-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-medium text-red-500">
            {formatTime(duration)}
          </span>
          <div className="flex-1 flex items-center gap-0.5 px-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400/60 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 16 + 6}px`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <Button
          size="icon"
          variant="destructive"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={stopRecording}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-9 w-9 rounded-full shrink-0"
      onClick={startRecording}
    >
      <Mic className="h-4.5 w-4.5 text-muted-foreground" />
    </Button>
  );
}
