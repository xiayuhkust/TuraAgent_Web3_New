import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Mic, Send, Bot, Code2, Wallet, RefreshCw } from 'lucide-react';
import { AgenticWorkflow } from '../../agentic_workflow/AgenticWorkflow';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { WalletAgent } from '../../agents/WalletAgent';
import { Agent, OfficialAgent, WorkflowAgent } from '../../types/agentTypes';

interface SignatureDetails {
  title?: string;
  description?: string;
  requirePassword?: boolean;
  onConfirm?: (password?: string) => Promise<void>;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'error';
  timestamp: string;
  agentId?: string;
  agentName?: string;
  agentType?: 'official' | 'community' | 'workflow';
}

export default function ChatPage() {
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForOpenAI, setIsWaitingForOpenAI] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [chatAddress, setChatAddress] = useState('');
  const [chatBalance, setChatBalance] = useState('0');
  const [activeAgent, setActiveAgent] = useState<Agent | OfficialAgent | WorkflowAgent | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [signatureDetails, setSignatureDetails] = useState<SignatureDetails | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    const storedAddress = localStorage.getItem('lastWalletAddress');
    if (storedAddress) {
      setChatAddress(storedAddress);
      setIsWalletConnected(true);
    }
  }, []);
  
  const walletAgent = useRef<WalletAgent>(new WalletAgent());
  const officialAgents = useRef<OfficialAgent[]>([]);
  const agents = useRef<Agent[]>([]);
  const workflows = useRef<WorkflowAgent[]>([]);
  
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
                const walletAgent = officialAgents.find(a => a.name === 'WalletAgent');
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
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          {activeAgent ? activeAgent.name : 'Chat'}
          
          {activeAgent?.name === 'AgentManager' && !chatAddress && (
            <div 
              className="ml-4 p-2 bg-yellow-100 text-yellow-800 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-yellow-200 transition-colors" 
              onClick={() => {
                const walletAgent = officialAgents.find(a => a.name === 'WalletAgent');
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
                    if (signatureDetails.requirePassword && !password) {
                      const agentKey = activeAgent?.name ?? 'unknown';
                      setMessagesMap(prev => ({
                        ...prev,
                        [agentKey]: [...(prev[agentKey] || []), {
                          id: Date.now().toString(),
                          text: 'Error: Password is required',
                          sender: 'error',
                          timestamp: new Date().toISOString()
                        }]
                      }));
                      return;
                    }
                    await signatureDetails.onConfirm(signatureDetails.requirePassword ? password : undefined);
                    setPassword('');
                    setShowSignatureDialog(false);
                  } catch (error) {
                    console.error('Transaction failed:', error);
                    const agentKey = activeAgent?.name ?? 'unknown';
                    setMessagesMap(prev => ({
                      ...prev,
                      [agentKey]: [...(prev[agentKey] || []), {
                        id: Date.now().toString(),
                        text: `Error: ${error instanceof Error ? error.message : 'Transaction failed'}`,
                        sender: 'error',
                        timestamp: new Date().toISOString()
                      }]
                    }));
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
      <CardContent className="flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {(activeAgent && messagesMap[activeAgent.name] ? messagesMap[activeAgent.name] : []).map((message) => (
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
                      const agentKey = activeAgent?.name ?? 'unknown';
                      setMessagesMap(prev => ({
                        ...prev,
                        [agentKey]: [...(prev[agentKey] || []), {
                          id: Date.now().toString(),
                          text: 'Error: Password is required',
                          sender: 'error',
                          timestamp: new Date().toISOString()
                        }]
                      }));
                      return;
                    }
                    await signatureDetails.onConfirm(signatureDetails.requirePassword ? password : undefined);
                    setPassword('');
                    setShowSignatureDialog(false);
                  } catch (error) {
                    console.error('Transaction failed:', error);
                    const agentKey = activeAgent?.name ?? 'unknown';
                    setMessagesMap(prev => ({
                      ...prev,
                      [agentKey]: [...(prev[agentKey] || []), {
                        id: Date.now().toString(),
                        text: `Error: ${error instanceof Error ? error.message : 'Transaction failed'}`,
                        sender: 'error',
                        timestamp: new Date().toISOString()
                      }]
                    }));
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
                        const welcomeMessage: Message = {
                          id: Date.now().toString(),
                          text: `Connected to ${agent.name}`,
                          sender: 'agent',
                          timestamp: new Date().toISOString()
                        };
                        setMessagesMap({
                          ...messagesMap,
                          [agent.name]: [welcomeMessage]
                        });
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
                        const welcomeMessage: Message = {
                          id: Date.now().toString(),
                          text: `Connected to ${agent.name}`,
                          sender: 'agent',
                          timestamp: new Date().toISOString()
                        };
                        setMessagesMap({
                          ...messagesMap,
                          [agent.name]: [welcomeMessage]
                        });
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
                        const welcomeMessage: Message = {
                          id: Date.now().toString(),
                          text: `Connected to ${workflow.name}`,
                          sender: 'agent',
                          timestamp: new Date().toISOString()
                        };
                        setMessagesMap({
                          ...messagesMap,
                          [workflow.name]: [welcomeMessage]
                        });
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
              {(activeAgent && messagesMap[activeAgent.name] ? messagesMap[activeAgent.name] : []).map((message) => (
>>>>>>> 26edb5a2 (feat: hide wallet/workflow tabs, separate agent dialogues, show wallet notification)
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
            className={`shrink-0 ${isRecording ? 'text-destructive' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || !activeAgent}
          >
            <Mic className="h-5 w-5" />
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
            disabled={isLoading || !activeAgent}
          />
          <Button
            className="shrink-0"
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading || !activeAgent}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>

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
                      const agentKey = activeAgent?.name ?? 'unknown';
                      setMessagesMap(prev => ({
                        ...prev,
                        [agentKey]: [...(prev[agentKey] || []), {
                          id: Date.now().toString(),
                          text: 'Error: Password is required',
                          sender: 'error',
                          timestamp: new Date().toISOString()
                        }]
                      }));
                      return;
                    }
                    await signatureDetails.onConfirm(signatureDetails.requirePassword ? password : undefined);
                    setPassword('');
                    setShowSignatureDialog(false);
                  } catch (error) {
                    console.error('Transaction failed:', error);
                    const agentKey = activeAgent?.name ?? 'unknown';
                    setMessagesMap(prev => ({
                      ...prev,
                      [agentKey]: [...(prev[agentKey] || []), {
                        id: Date.now().toString(),
                        text: `Error: ${error instanceof Error ? error.message : 'Transaction failed'}`,
                        sender: 'error',
                        timestamp: new Date().toISOString()
                      }]
                    }));
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
    </Card>
  );
}
