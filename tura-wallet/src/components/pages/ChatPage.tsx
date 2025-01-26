import { useState, useRef, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'error';
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // TODO: Implement agent response logic
    const response: Message = {
      id: (Date.now() + 1).toString(),
      text: `Received: ${inputText}`,
      sender: 'agent',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, response]);
  };

  const startRecording = async () => {
    try {
      // Check if mediaDevices API is supported
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser');
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      // First check if we have permission
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('Microphone permission status:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission denied. Please enable microphone access in your browser settings.');
      }

      // Try to get stream with specific constraints for Baidu API
      let stream;
      try {
        const constraints = {
          audio: {
            sampleRate: 16000,    // Required by Baidu API
            channelCount: 1,      // Mono audio required
            echoCancellation: true,
            noiseSuppression: true
          }
        };
        
        console.log('Requesting audio stream with constraints:', constraints);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Verify the actual stream settings
        const audioTrack = stream.getAudioTracks()[0];
        const settings = audioTrack.getSettings();
        console.log('Actual audio track settings:', {
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          deviceId: settings.deviceId,
          groupId: settings.groupId,
          autoGainControl: settings.autoGainControl,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          timestamp: new Date().toISOString()
        });
        
        // Warn if sample rate doesn't match requirements
        if (settings.sampleRate !== 16000) {
          console.warn('Warning: Audio sample rate does not match required 16kHz:', settings.sampleRate);
        }
      } catch (constraintError) {
        console.warn('Failed to get stream with specific constraints, falling back to default:', constraintError);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Log fallback stream settings
        const audioTrack = stream.getAudioTracks()[0];
        const settings = audioTrack.getSettings();
        console.log('Fallback audio track settings:', settings);
      }

      // Try to use specific MIME type for better compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';  // Fallback to basic webm
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use the MIME type we actually got
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await handleSpeechToText(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with 15-second time limit
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 15000);
    } catch (error: any) {
      // Log detailed error information for debugging
      console.error('Recording failed:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor,
          mediaDevices: !!navigator.mediaDevices,
          mediaRecorder: !!window.MediaRecorder,
          secure: window.isSecureContext
        },
        constraints: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Provide user-friendly error message based on error type
      let errorMessage = 'Failed to start recording. ';
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage += 'Please grant microphone permissions.';
          break;
        case 'NotFoundError':
          errorMessage += 'No microphone found.';
          break;
        case 'NotReadableError':
          errorMessage += 'Microphone is already in use.';
          break;
        case 'OverconstrainedError':
          errorMessage += 'Microphone does not support required audio settings.';
          break;
        default:
          errorMessage += 'Please check your microphone settings.';
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: errorMessage,
        sender: 'error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSpeechToText = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      // Convert audio to WAV format if it's not already
      let processedBlob = audioBlob;
      if (audioBlob.type !== 'audio/wav') {
        console.log('Converting audio to WAV format...', {
          originalType: audioBlob.type,
          originalSize: audioBlob.size,
          timestamp: new Date().toISOString()
        });
        
        const audioContext = new AudioContext();
        console.log('Audio context created:', {
          sampleRate: audioContext.sampleRate,
          state: audioContext.state,
          timestamp: new Date().toISOString()
        });
        
        const arrayBuffer = await audioBlob.arrayBuffer();
        console.log('Array buffer created:', {
          byteLength: arrayBuffer.byteLength,
          timestamp: new Date().toISOString()
        });
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create WAV file
        const wavBuffer = await new Promise<ArrayBuffer>((resolve) => {
          const numberOfChannels = 1; // Mono
          const sampleRate = 16000;   // Required by Baidu API
          const length = audioBuffer.length;
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
          view.setUint32(24, sampleRate, true);            // Sample rate
          view.setUint32(28, sampleRate * 2, true);        // Byte rate
          view.setUint16(32, numberOfChannels * 2, true);  // Block align
          view.setUint16(34, 16, true);                    // Bits per sample
          writeString(view, 36, 'data');                   // Data chunk identifier
          view.setUint32(40, length * 2, true);            // Data chunk length
          
          // Write audio data
          const data = new Float32Array(audioBuffer.getChannelData(0));
          let offset = 44;
          for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
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
        
        console.log('WAV header verification:', {
          ...header,
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
        
        processedBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        console.log('WAV blob created:', {
          size: processedBlob.size,
          type: processedBlob.type,
          timestamp: new Date().toISOString()
        });
      }

      const formData = new FormData();
      formData.append('audio', processedBlob, 'recording.wav');
      
      // Log request details
      console.log('Preparing API request:', {
        contentType: processedBlob.type,
        fileName: 'recording.wav',
        fileSize: processedBlob.size,
        timestamp: new Date().toISOString()
      });

      // Log FormData contents for debugging
      const formDataEntries = Array.from(formData.entries());
      console.log('FormData contents:', {
        entries: formDataEntries.map(([key, value]) => ({
          key,
          type: value instanceof Blob ? value.type : typeof value,
          size: value instanceof Blob ? value.size : null,
          filename: value instanceof File ? value.name : null
        })),
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/v1/speech-to-text', {
        method: 'POST',
        // Don't set Content-Type header - browser will set it with boundary
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Speech-to-text failed: ${response.statusText}`);
      }

      const data = await response.json();
      setInputText(data.text);
    } catch (error) {
      console.error('Speech-to-text error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Failed to convert speech to text. Please try again.',
        sender: 'error',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.sender === 'error'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  <div>{message.text}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={isRecording ? 'text-destructive' : ''}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
