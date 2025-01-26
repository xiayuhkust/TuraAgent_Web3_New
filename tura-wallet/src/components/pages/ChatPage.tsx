import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, Code2, Wallet } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { officialAgents, agents, workflows } from '../../stores/agent-store';
import { Agent, OfficialAgent, Workflow } from '../../types/agentTypes';
import WalletManager from '../../lib/wallet_manager';

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
  const [activeAgent, setActiveAgent] = useState<OfficialAgent | Agent | Workflow | null>(null);
  const [chatAccount, setChatAccount] = useState('');
  const [chatBalance, setChatBalance] = useState('0');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<Date | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const walletManager = useRef(new WalletManager());
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for stored wallet and update balance
  useEffect(() => {
    const checkStoredWallet = async () => {
      try {
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (storedAddress) {
          setChatAccount(storedAddress);
          setIsRefreshingBalance(true);
          try {
            const balance = await walletManager.current.getBalance(storedAddress);
            setChatBalance(balance);
            setLastBalanceUpdate(new Date());
          } catch (error) {
            console.warn('Failed to get initial balance:', error);
          } finally {
            setIsRefreshingBalance(false);
          }
        }
      } catch (error) {
        console.error('Failed to check stored wallet:', error);
      }
    };

    checkStoredWallet();

    // Set up interval to refresh balance every 30 seconds
    const intervalId = setInterval(async () => {
      const storedAddress = localStorage.getItem('lastWalletAddress');
      if (storedAddress) {
        try {
          setIsRefreshingBalance(true);
          const balance = await walletManager.current.getBalance(storedAddress);
          setChatBalance(balance);
          setLastBalanceUpdate(new Date());
        } catch (error) {
          console.warn('Failed to refresh balance:', error);
        } finally {
          setIsRefreshingBalance(false);
        }
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

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
    } catch (error) {
      // Log detailed error information for debugging
      const err = error as Error;
      console.error('Recording failed:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
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
      const getErrorMessage = (errName: string): string => {
        const baseMessage = 'Failed to start recording. ';
        switch (errName) {
          case 'NotAllowedError':
            return baseMessage + 'Please grant microphone permissions.';
          case 'NotFoundError':
            return baseMessage + 'No microphone found.';
          case 'NotReadableError':
            return baseMessage + 'Microphone is already in use.';
          case 'OverconstrainedError':
            return baseMessage + 'Microphone does not support required audio settings.';
          default:
            return baseMessage + 'Please check your microphone settings.';
        }
      };
      const message = getErrorMessage(err.name);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: message,
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6" />
            {activeAgent ? activeAgent.name : 'Chat'}
          </div>
          {chatAccount && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="font-mono">
                  {`${chatAccount.slice(0, 6)}...${chatAccount.slice(-4)}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>{chatBalance} TURA</span>
                {isRefreshingBalance && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Refreshing...
                  </span>
                )}
                {lastBalanceUpdate && (
                  <span className="text-xs text-muted-foreground">
                    Updated: {lastBalanceUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full gap-4">
        {/* AgenticWorkflow Sidebar */}
        <div className="w-[30%] border-r pr-4">
          <ScrollArea className="h-full">
            <div className="space-y-6">
              {/* Official Agents */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Official Agents
                </h3>
                <div className="space-y-2">
                  {officialAgents.map(agent => (
                    <div
                      key={agent.name}
                      className={`p-3 rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors ${
                        activeAgent?.name === agent.name ? 'bg-secondary/90 ring-2 ring-primary' : 'bg-secondary'
                      }`}
                      onClick={() => {
                        setActiveAgent(agent);
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          text: `Connected to ${agent.name}`,
                          sender: 'agent',
                          timestamp: new Date().toISOString()
                        }]);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          {agent.name}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{agent.description}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Fee: {agent.feePerRequest}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Agents */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Community Agents
                </h3>
                <div className="space-y-2">
                  {agents.map(agent => (
                    <div
                      key={agent.contractAddress}
                      className={`p-3 rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors ${
                        activeAgent?.name === agent.name ? 'bg-secondary/90 ring-2 ring-primary' : 'bg-secondary'
                      }`}
                      onClick={() => {
                        setActiveAgent(agent);
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          text: `Connected to ${agent.name}`,
                          sender: 'agent',
                          timestamp: new Date().toISOString()
                        }]);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{agent.name}</div>
                        <Badge variant="secondary" className="text-xs">
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{agent.description}</div>
                      <div className="text-xs font-mono mt-2">
                        Contract: {agent.contractAddress.slice(0, 6)}...{agent.contractAddress.slice(-4)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Fee: {agent.feePerRequest}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflows */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Workflows
                </h3>
                <div className="space-y-2">
                  {workflows.map(workflow => (
                    <div
                      key={workflow.contractAddress}
                      className={`p-3 rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors ${
                        activeAgent?.name === workflow.name ? 'bg-secondary/90 ring-2 ring-primary' : 'bg-secondary'
                      }`}
                      onClick={() => {
                        setActiveAgent(workflow);
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          text: `Connected to ${workflow.name}`,
                          sender: 'agent',
                          timestamp: new Date().toISOString()
                        }]);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{workflow.name}</div>
                        <Badge variant="secondary" className="text-xs">
                          {workflow.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{workflow.description}</div>
                      <div className="text-xs font-mono mt-2">
                        Contract: {workflow.contractAddress.slice(0, 6)}...{workflow.contractAddress.slice(-4)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Fee: {workflow.fee} • Confirmations: {workflow.requiredConfirmations}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
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
        </div>
      </CardContent>
    </Card>
  );
}
