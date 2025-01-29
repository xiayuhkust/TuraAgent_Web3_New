import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, Code2, Wallet, RefreshCw } from 'lucide-react';
import { AgenticWorkflow } from '../../agentic_workflow/AgenticWorkflow';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { officialAgents, agents, workflows } from '../../stores/agent-store';
import { Agent, OfficialAgent, Workflow } from '../../types/agentTypes';
import { WalletAgent } from '../../agentic_workflow/WalletAgent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'error';
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signatureDetails, setSignatureDetails] = useState<{
    title: string;
    description: string;
    requirePassword?: boolean;
    onConfirm: (password?: string) => Promise<void>;
  } | null>(null);
  const [password, setPassword] = useState('');

  // Expose dialog control to window for AgentManager
  useEffect(() => {
    (window as any).ChatPage = {
      showSignatureDialog: (details: {
        title: string;
        description: string;
        requirePassword?: boolean;
        onConfirm: (password?: string) => Promise<void>;
      }) => {
        setSignatureDetails(details);
        setShowSignatureDialog(true);
      }
    };
    return () => {
      delete (window as any).ChatPage;
    };
  }, []);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<OfficialAgent | Agent | Workflow | null>(officialAgents[0]); // Default to WalletAgent
  const [chatAddress, setChatAddress] = useState('');
  const [chatBalance, setChatBalance] = useState('0');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(Date.now());
  const [walletAgent] = useState(() => (officialAgents[0].instance as WalletAgent));
  
  // Initialize messages with welcome message
  useEffect(() => {
    const initializeChat = async () => {
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          text: 'Welcome! I am your WalletAgent. I can help you create a wallet, check your balance, or request test tokens. How can I assist you today?',
          sender: 'agent',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    };
    initializeChat();
  }, []);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat and set up balance refresh interval
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (storedAddress) {
          setChatAddress(storedAddress);
          // Check wallet session through WalletAgent
          const response = await walletAgent.processMessage('check balance');
          const balanceMatch = response.match(/contains (\d+(?:\.\d+)?)/);
          if (balanceMatch) {
            setChatBalance(balanceMatch[1]);
          }
        } else {
          const welcomeResponse = await walletAgent.processMessage('help');
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: welcomeResponse,
            sender: 'agent',
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: 'There was an error initializing the chat. Please try refreshing the page.',
          sender: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    };

    initializeChat();

    // Set up balance refresh interval for transactions and deployments
    const refreshInterval = setInterval(async () => {
      // Refresh more frequently right after a message (every 2s for first 30s)
      if (chatAddress) {
        try {
          const response = await walletAgent.processMessage('check balance');
          const balanceMatch = response.match(/contains (\d+(?:\.\d+)?)/);
          if (balanceMatch) {
            setChatBalance(balanceMatch[1]);
          }
        } catch (error) {
          console.error('Balance refresh failed:', error);
        }
      }
    }, Date.now() - lastMessageTime < 30000 ? 2000 : 5000);

    return () => clearInterval(refreshInterval);
  }, [walletAgent, lastMessageTime, chatAddress]);

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
    setLastMessageTime(Date.now());

    try {
      // Process message through WalletAgent
      if (!activeAgent || activeAgent.name === 'WalletAgent') {
        const agentResponse = await walletAgent.processMessage(inputText);
        
        // Update UI state based on agent response
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (storedAddress !== chatAddress) {
          setChatAddress(storedAddress || '');
        }
        
        // Always refresh balance after agent response for faucet-related actions
        if (chatAddress) {
          try {
            setIsRefreshingBalance(true);
            const balanceResponse = await walletAgent.processMessage('check balance');
            const balanceMatch = balanceResponse.match(/contains (\d+(?:\.\d+)?)/);
            if (balanceMatch) {
              setChatBalance(balanceMatch[1]);
            }
          } catch (error) {
            console.error('Balance refresh failed:', error);
          } finally {
            setIsRefreshingBalance(false);
          }
        }

        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: agentResponse,
          sender: 'agent',
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, response]);
      } else if (activeAgent?.instance instanceof AgenticWorkflow) {
        // Process message through agent's instance
        const agentResponse = await activeAgent.instance.processMessage(inputText);
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: agentResponse,
          sender: 'agent',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, response]);
      }
    } catch (error: unknown) {
      console.error('Agent processing error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${message}`,
        sender: 'error',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
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
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          {activeAgent ? activeAgent.name : 'Chat'}
          
          {chatAddress && (
            <div className="p-2 bg-secondary rounded-lg flex flex-col items-start ml-4">
              <div className="text-xs text-muted-foreground">Account</div>
              <div className="font-mono text-sm break-all">
                {chatAddress.slice(0,6)}...{chatAddress.slice(-4)}
              </div>
            </div>
          )}

          {chatAddress && (
            <div className="p-2 bg-secondary rounded-lg flex flex-col items-start ml-2">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="text-sm font-bold flex items-center gap-2">
                {chatBalance} TURA
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={async () => {
                    if (isRefreshingBalance) return;
                    try {
                      setIsRefreshingBalance(true);
                      const response = await walletAgent.processMessage('check balance');
                      const balanceMatch = response.match(/contains (\d+(?:\.\d+)?)/);
                      if (balanceMatch) {
                        setChatBalance(balanceMatch[1]);
                      }
                    } catch (error) {
                      console.error('Balance refresh failed:', error);
                    } finally {
                      setIsRefreshingBalance(false);
                    }
                  }}
                  disabled={isRefreshingBalance}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      {/* Signature Dialog */}
      <Dialog 
        open={showSignatureDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setPassword('');
          }
          setShowSignatureDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{signatureDetails?.title || 'Confirm Transaction'}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {signatureDetails?.description || 'Please confirm this transaction in your wallet.'}
            </DialogDescription>
          </DialogHeader>
          {signatureDetails?.requirePassword && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your wallet password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setPassword('');
                setShowSignatureDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (signatureDetails?.onConfirm) {
                  try {
                    if (signatureDetails.requirePassword && !password) {
                      setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        text: 'Error: Password is required',
                        sender: 'error',
                        timestamp: new Date().toISOString()
                      }]);
                      return;
                    }
                    await signatureDetails.onConfirm(signatureDetails.requirePassword ? password : undefined);
                    setPassword('');
                    setShowSignatureDialog(false);
                  } catch (error) {
                    console.error('Transaction failed:', error);
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(),
                      text: `Error: ${error instanceof Error ? error.message : 'Transaction failed'}`,
                      sender: 'error',
                      timestamp: new Date().toISOString()
                    }]);
                  }
                }
              }}
              disabled={signatureDetails?.requirePassword && !password}
            >
              Sign & Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Interface */}


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
