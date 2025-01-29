import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Mic, Send, Bot, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import { ScrollArea } from '../ui/scroll-area';

import { Agent, OfficialAgent, WorkflowAgent, Message } from '../../types/agentTypes';
import { WalletAgent } from '../../agents/WalletAgent';

function ChatPage() {
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForOpenAI, setIsWaitingForOpenAI] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [chatAddress, setChatAddress] = useState('');
  const [chatBalance, setChatBalance] = useState('0');
  const [activeAgent, setActiveAgent] = useState<Agent | OfficialAgent | WorkflowAgent | null>(null);
  useEffect(() => {
    const storedAddress = localStorage.getItem('lastWalletAddress');
    if (storedAddress) {
      setChatAddress(storedAddress);
    }
  }, []);
  
  const walletAgent = useRef<WalletAgent>(new WalletAgent());
  const officialAgents = useRef<OfficialAgent[]>([new WalletAgent()]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeAgent && messagesMap[activeAgent.name]?.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesMap, activeAgent]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeAgent) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      agentId: activeAgent.id,
      agentName: activeAgent.name,
      agentType: activeAgent instanceof WalletAgent ? 'official' : 'workflow'
    };

    const agentKey = activeAgent?.name ?? 'unknown';
    setMessagesMap(prev => ({
      ...prev,
      [agentKey]: [...(prev[agentKey] || []), newMessage]
    }));
    setInputText('');

      console.log('Processing message through agent:', {
        agent: activeAgent.name,
        instance: activeAgent.instance.constructor.name,
        message: inputText
      });

      // Clear any previous messages if switching agents
      if (activeAgent && messagesMap[activeAgent.name]?.length === 1 && messagesMap[activeAgent.name][0].sender === 'agent') {
        setMessagesMap(prev => ({ ...prev, [activeAgent.name]: [] }));
      }
      
      try {
        // Get agent response
        const agentResponse = await activeAgent.instance.processMessage(inputText);
        console.log('Received agent response:', agentResponse);
        
        // Create message object
        const response: Message = {
          id: Date.now().toString(),
          text: agentResponse,
          sender: 'agent',
          timestamp: new Date().toISOString()
        };

        // Add response to chat
        console.log('Adding response to messages:', response);
        const agentKey = activeAgent.name;
        setMessagesMap(prev => ({
          ...prev,
          [agentKey]: [...(prev[agentKey] || []), response]
        }));

        // Update UI state if needed
        if (activeAgent.name === 'WalletAgent') {
          // Update UI state based on agent response
          const storedAddress = localStorage.getItem('lastWalletAddress');
          if (storedAddress !== chatAddress) {
            setChatAddress(storedAddress || '');
          }
          
          // Always refresh balance after agent response for faucet-related actions
          if (chatAddress) {
            try {
              setIsRefreshingBalance(true);
              const balanceResponse = await walletAgent.current.processMessage('check balance');
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
      const agentKey = activeAgent?.name ?? 'unknown';
      setMessagesMap(prev => ({
        ...prev,
        [agentKey]: [...(prev[agentKey] || []), errorResponse]
      }));
    } finally {
      setIsWaitingForOpenAI(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
      console.error('Failed to start recording:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Failed to start recording. Please check your microphone permissions.',
        sender: 'error',
        timestamp: new Date().toISOString()
      };
      const agentKey = activeAgent?.name ?? 'unknown';
      setMessagesMap(prev => ({
        ...prev,
        [agentKey]: [...(prev[agentKey] || []), errorMessage]
      }));
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
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Failed to convert speech to text. Please try again.',
        sender: 'error',
        timestamp: new Date().toISOString()
      };
      const agentKey = activeAgent?.name ?? 'unknown';
      setMessagesMap(prev => ({
        ...prev,
        [agentKey]: [...(prev[agentKey] || []), errorMessage]
      }));
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
          
          {activeAgent?.name === 'AgentManager' && !chatAddress && (
            <div 
              className="ml-4 p-2 bg-yellow-100 text-yellow-800 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-yellow-200 transition-colors" 
              onClick={() => {
                const walletAgent = officialAgents.current.find(a => a.name === 'WalletAgent');
                if (walletAgent) {
                  setActiveAgent(walletAgent);
                  const welcomeMessage: Message = {
                    id: Date.now().toString(),
                    text: 'Welcome to WalletAgent! I can help you create or connect your wallet.',
                    sender: 'agent',
                    timestamp: new Date().toISOString()
                  };
                  setMessagesMap({
                    ...messagesMap,
                    [walletAgent.name]: [welcomeMessage]
                  });
                }
              }}
            >
              <AlertTriangle className="h-4 w-4" />
              Please connect your wallet via WalletAgent to access all features
            </div>
          )}
          
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
                      const response = await walletAgent.current.processMessage('check balance');
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

      <CardContent className="flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {(activeAgent && messagesMap[activeAgent.name] ? messagesMap[activeAgent.name] : []).map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.sender === 'error'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4">
          <Button
            variant="ghost"
            size="icon"
            className={isRecording ? 'text-destructive' : ''}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isWaitingForOpenAI}
          >
            <Mic className="h-4 w-4" />
          </Button>
          
          <Input
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading || isWaitingForOpenAI || !activeAgent}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading || isWaitingForOpenAI || !activeAgent}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChatPage;
