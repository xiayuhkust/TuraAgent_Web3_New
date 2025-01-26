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

      // Try to get stream with specific constraints for Baidu API
      let stream;
      let usingFallback = false;
      
      try {
        const constraints = {
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        };
        
        console.log('Requesting audio stream with constraints:', constraints);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintError) {
        console.warn('Failed to get stream with specific constraints:', constraintError);
        console.log('Falling back to default audio constraints');
        
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        usingFallback = true;
      }
      
      // Log actual stream settings
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      console.log('Audio track settings:', {
        usingFallback,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        deviceId: settings.deviceId,
        groupId: settings.groupId,
        autoGainControl: settings.autoGainControl,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        timestamp: new Date().toISOString()
      });
      
      // Update status with fallback info
      setStatus(
        usingFallback
          ? `Using fallback mode (${settings.sampleRate}Hz, ${settings.channelCount} channels) - Will resample to 16kHz`
          : `Got microphone stream (${settings.sampleRate}Hz, ${settings.channelCount} channels)`
      );
      
      // Log supported MIME types
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/wav',
        'audio/ogg;codecs=opus'
      ].filter(type => MediaRecorder.isTypeSupported(type));
      
      console.log('Supported MIME types:', supportedTypes);

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log('Recording complete:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: chunksRef.current.length,
          timestamp: new Date().toISOString()
        });

        try {
          // Convert to WAV for testing
          const audioContext = new AudioContext();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          console.log('Audio buffer details:', {
            duration: audioBuffer.duration,
            numberOfChannels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate,
            length: audioBuffer.length,
            timestamp: new Date().toISOString()
          });
          
          // Create WAV file with resampling if needed
          const wavBuffer = await new Promise<ArrayBuffer>((resolve) => {
            const targetSampleRate = 16000;  // Required by Baidu API
            const numberOfChannels = 1;      // Mono required
            
            // Resample if source rate doesn't match target
            let audioData;
            let length;
            
            if (audioBuffer.sampleRate !== targetSampleRate) {
              console.log('Resampling audio from', audioBuffer.sampleRate, 'Hz to', targetSampleRate, 'Hz');
              
              // Simple linear resampling
              const scale = audioBuffer.sampleRate / targetSampleRate;
              const newLength = Math.round(audioBuffer.length / scale);
              const resampledData = new Float32Array(newLength);
              const channelData = audioBuffer.getChannelData(0);
              
              for (let i = 0; i < newLength; i++) {
                const originalIndex = i * scale;
                const index1 = Math.floor(originalIndex);
                const index2 = Math.min(index1 + 1, audioBuffer.length - 1);
                const fraction = originalIndex - index1;
                
                // Linear interpolation
                resampledData[i] = (1 - fraction) * channelData[index1] + fraction * channelData[index2];
              }
              
              audioData = resampledData;
              length = newLength;
            } else {
              audioData = audioBuffer.getChannelData(0);
              length = audioBuffer.length;
            }
            
            const wavBuffer = new ArrayBuffer(44 + length * 2);
            const view = new DataView(wavBuffer);
            
            // WAV header
            const writeString = (view: DataView, offset: number, string: string) => {
              for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
              }
            };
            
            writeString(view, 0, 'RIFF');                     // RIFF identifier
            view.setUint32(4, 36 + length * 2, true);        // File length
            writeString(view, 8, 'WAVE');                     // WAVE identifier
            writeString(view, 12, 'fmt ');                    // Format chunk identifier
            view.setUint32(16, 16, true);                    // Length of format data
            view.setUint16(20, 1, true);                     // Format type (1 = PCM)
            view.setUint16(22, numberOfChannels, true);      // Number of channels
            view.setUint32(24, targetSampleRate, true);            // Sample rate
            view.setUint32(28, targetSampleRate * 2, true);        // Byte rate
            view.setUint16(32, numberOfChannels * 2, true);  // Block align
            view.setUint16(34, 16, true);                    // Bits per sample
            writeString(view, 36, 'data');                   // Data chunk identifier
            view.setUint32(40, length * 2, true);            // Data chunk length
            
            // Write audio data
            let offset = 44;
            for (let i = 0; i < length; i++) {
              const sample = Math.max(-1, Math.min(1, audioData[i]));
              view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
              offset += 2;
            }
            
            resolve(wavBuffer);
          });
          
          // Verify WAV header contents
          const headerView = new DataView(wavBuffer.slice(0, 44));
          const header = {
            chunkId: String.fromCharCode(...new Uint8Array(wavBuffer.slice(0, 4))),
            fileSize: headerView.getUint32(4, true),
            format: String.fromCharCode(...new Uint8Array(wavBuffer.slice(8, 12))),
            subchunk1Id: String.fromCharCode(...new Uint8Array(wavBuffer.slice(12, 16))),
            subchunk1Size: headerView.getUint32(16, true),
            audioFormat: headerView.getUint16(20, true),
            numChannels: headerView.getUint16(22, true),
            sampleRate: headerView.getUint32(24, true),
            byteRate: headerView.getUint32(28, true),
            blockAlign: headerView.getUint16(32, true),
            bitsPerSample: headerView.getUint16(34, true),
            subchunk2Id: String.fromCharCode(...new Uint8Array(wavBuffer.slice(36, 40))),
            subchunk2Size: headerView.getUint32(40, true)
          };
          
          console.log('WAV conversion test:', {
            header,
            isValid: (
              header.chunkId === 'RIFF' &&
              header.format === 'WAVE' &&
              header.subchunk1Id === 'fmt ' &&
              header.subchunk2Id === 'data' &&
              header.audioFormat === 1 &&
              header.numChannels === 1 &&
              header.sampleRate === 16000 &&
              header.bitsPerSample === 16
            ),
            byteLength: wavBuffer.byteLength,
            timestamp: new Date().toISOString()
          });
          
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
          setAudioData(wavBlob);
          setStatus(`Recording converted to WAV (${(wavBlob.size / 1024).toFixed(1)}KB)`);
        } catch (error) {
          console.error('WAV conversion failed:', error);
          setAudioData(audioBlob);
          setStatus(`Recording complete (${(audioBlob.size / 1024).toFixed(1)}KB) - WAV conversion failed`);
        }
        
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
