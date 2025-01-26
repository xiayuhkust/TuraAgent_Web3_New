import { useState, useRef } from 'react';

export default function MicrophoneTest() {
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone access...');
      setError(null);

      // Check if mediaDevices API is supported
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }

      // Request microphone access with Baidu API requirements
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      setStatus('Got microphone stream. Testing MediaRecorder...');

      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
      }

      // Test MIME type support
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setStatus(`Got audio chunk: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        setStatus('Recording stopped');
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start(100);
      setStatus('Recording started');

      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);

    } catch (error: any) {
      console.error('Recording test failed:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setError(`${error.name}: ${error.message}`);
      setStatus('Test failed');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Microphone Test Page</h1>
      
      <div className="space-y-2">
        <p>Status: <span className="font-mono">{status}</span></p>
        {error && (
          <p className="text-destructive">Error: <span className="font-mono">{error}</span></p>
        )}
      </div>

      <button
        onClick={startRecording}
        disabled={status.includes('Recording')}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
      >
        Test Microphone
      </button>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Test Configuration:</p>
        <ul className="list-disc list-inside">
          <li>Sample Rate: 16kHz</li>
          <li>Channels: Mono</li>
          <li>Echo Cancellation: Enabled</li>
          <li>Noise Suppression: Enabled</li>
        </ul>
      </div>
    </div>
  );
}
