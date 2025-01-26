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
>>>>>>> a027cf8 (fix: improve microphone permission handling and error logging)
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
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
<<<<<<< HEAD
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

>>>>>>> a027cf8 (fix: improve microphone permission handling and error logging)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Failed to start recording. Please check your microphone permissions.',
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
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/v1/speech-to-text', {
        method: 'POST',
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
