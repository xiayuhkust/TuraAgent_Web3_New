import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MinimalMicrophoneTest() {
  const [status, setStatus] = useState<string>('Ready');
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone access...');
      setError(null);
      setAudioData(null);
      chunksRef.current = [];

      // Request microphone access with Baidu API requirements
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      setStatus('Got microphone stream, initializing recorder...');

      // Create MediaRecorder with supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          setStatus(`Recording... (${chunksRef.current.length} chunks)`);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        setAudioData(audioBlob);
        setStatus('Recording complete');
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start(100); // Collect data in 100ms chunks
      setStatus('Recording started');

      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);

    } catch (error: any) {
      console.error('Recording failed:', error);
      setError(`${error.name}: ${error.message}`);
      setStatus('Test failed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Minimal Microphone Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="font-medium">Status: <span className="font-mono">{status}</span></p>
          {error && (
            <p className="text-destructive font-mono text-sm">{error}</p>
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={startRecording}
            disabled={status.includes('Recording')}
          >
            Start Test Recording
          </Button>
          <Button
            variant="outline"
            onClick={stopRecording}
            disabled={!status.includes('Recording')}
          >
            Stop Recording
          </Button>
        </div>

        {audioData && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Recording Info:</p>
            <p className="font-mono text-sm">Size: {audioData.size} bytes</p>
            <p className="font-mono text-sm">Type: {audioData.type}</p>
            <audio controls src={URL.createObjectURL(audioData)} className="mt-2" />
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Test Configuration:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sample Rate: 16kHz</li>
            <li>Channels: Mono</li>
            <li>Echo Cancellation: Enabled</li>
            <li>Noise Suppression: Enabled</li>
            <li>Format: WebM with Opus codec</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
