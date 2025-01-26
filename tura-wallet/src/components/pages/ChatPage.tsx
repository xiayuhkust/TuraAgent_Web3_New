import { useRef, useState, useEffect } from "react";
import { MessageSquare, Send, Mic, Bot, Code2, Wallet } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AgenticWorkflow } from "../../agentic_workflow/AgenticWorkflow";
import { getAgent, getWorkflow, isValidAddress } from "../../stores/agent-store";

interface Agent {
  name: string;
  description: string;
  contractAddress?: string;
  feePerRequest?: string;
  owner?: string;
  multiSigAddress?: string;
  chainId?: number;
  status: string;
}

// Mock data based on agent-store.js structure
const officialAgents: Agent[] = [
  {
    name: 'WalletAgent',
    description: 'Your personal wallet assistant for managing TURA transactions',
    feePerRequest: '0.0 TURA',
    chainId: 1337,
    status: 'OFFICIAL'
  }
];

const communityAgents: Agent[] = [
  {
    name: 'MarketDataAgent',
    contractAddress: '0x8f8d84B2Fb15e81A3BEAa8144d2Eb1c340ce93FB',
    description: 'Market data provider for cryptocurrency trading',
    feePerRequest: '1.0 TURA',
    owner: '0x009f54E5CcbEFCdCa0dd85ddc85171A76B5c1ef1',
    multiSigAddress: '0x5BC87de68410DBa5c17e4496543dd325f60Ce6e8',
    chainId: 1337,
    status: 'VALID'
  },
  {
    name: 'StrategyAgent',
    contractAddress: '0xF31A3ffc032BbB21661c1b3A87f25D16551f930A',
    description: 'Trading strategy analysis and execution',
    feePerRequest: '0.01 TURA',
    owner: '0x21872525127D3346E92D1477190FDEC15604e337',
    multiSigAddress: '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e',
    chainId: 1337,
    status: 'VALID'
  }
];

const workflows = [
  {
    name: 'TuraAgentMultiSigV2',
    contractAddress: '0x9dAB58844d1E118bA44D4fBF730717cF5371EC98',
    description: 'Multi-signature wallet management workflow',
    fee: '0.0 TURA',
    owner: '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e',
    requiredConfirmations: 1,
    status: 'VALID'
  }
];

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent" | "error";
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState('official');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(officialAgents[0]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agent, setAgent] = useState(() => new AgenticWorkflow(
    selectedAgent?.name || "Chat Agent",
    selectedAgent?.description || "A helpful chat agent"
  ));

  const startRecording = async () => {
    try {
      // Request microphone access with specific constraints for Baidu API
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,        // Required sample rate for Baidu API
          channelCount: 1,          // Mono audio
          echoCancellation: true,   // Improve audio quality
          noiseSuppression: true    // Improve audio quality
        }
      });

      // Create MediaRecorder with WAV format
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/wav'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Create WAV blob with proper format
          const audioBlob = new Blob(chunksRef.current, {
            type: 'audio/wav'
          });
          await handleSpeechToText(audioBlob);
        } finally {
          // Always clean up audio tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      // Start recording with 100ms timeslices for better streaming
      mediaRecorder.start(100);
      setIsRecording(true);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 15000);

      // Show recording indicator
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '正在录音...',
        sender: 'agent',
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Failed to start recording:', error);
      let errorMessage = 'Failed to start recording. ';
      
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        errorMessage += 'Please grant microphone permissions in your browser settings.';
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else {
        errorMessage += 'Please check your microphone settings and try again.';
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

  // Fetch with timeout utility
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  };

  const handleSpeechToText = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Add Baidu API parameters
      formData.append('format', 'wav');  // Support wav and pcm formats
      formData.append('rate', '16000');  // Sample rate
      formData.append('channel', '1');   // Mono channel
      formData.append('dev_pid', '1737'); // Automatic language detection model
      formData.append('cuid', 'TuraAIWallet');

      const response = await fetchWithTimeout('/api/v1/speech-to-text', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      }, 10000); // 10 second timeout

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Speech recognition failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.err_no !== 0) {
        throw new Error(`Speech recognition failed: ${data.err_msg || 'Unknown error'}`);
      }

      if (!data.result || !Array.isArray(data.result)) {
        throw new Error('Invalid response format from speech recognition service');
      }

      setInputText(data.result[0]);
    } catch (error) {
      console.error('Speech-to-text error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: error instanceof Error ? error.message : 'Failed to convert speech to text. Please try again.',
        sender: 'error',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    if (!selectedAgent) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "请先选择一个Agent",
        sender: "error",
        timestamp: new Date().toISOString(),
      }]);
      return;
    }

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent response timed out after 10 seconds')), 10000)
    );

    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText("");

      // Get agent response with timeout
      let response: string;
      if (selectedAgent.contractAddress) {
        // Validate contract address and get latest agent data
        if (!isValidAddress(selectedAgent.contractAddress)) {
          throw new Error('Invalid contract address');
        }
        
        const storedAgent = getAgent(selectedAgent.contractAddress) || getWorkflow(selectedAgent.contractAddress);
        if (!storedAgent) {
          throw new Error('Agent or workflow not found in store');
        }

        // For contract-based agents, we'll need to implement contract interaction
        response = await Promise.race([
          Promise.resolve(`[${storedAgent.name}] Contract interaction not yet implemented. Contract: ${storedAgent.contractAddress}`),
          timeoutPromise
        ]);
      } else {
        // Use AgenticWorkflow for built-in agents with timeout
        response = await Promise.race([
          agent.processMessage(inputText),
          timeoutPromise
        ]);
      }
      
      // Add agent response
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "agent",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, agentMessage]);

    } catch (error) {
      console.error("Failed to process message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : "Failed to process message. Please try again.",
        sender: "error",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update agent instance when selected agent changes with error handling
  useEffect(() => {
    const initializeAgent = async () => {
      if (!selectedAgent) return;

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Agent initialization timed out after 10 seconds')), 10000)
        );

        // Initialize agent with timeout
        const newAgent = await Promise.race([
          Promise.resolve(new AgenticWorkflow(selectedAgent.name, selectedAgent.description)),
          timeoutPromise
        ]);

        setAgent(newAgent);
        // Clear messages when switching agents
        setMessages([{
          id: Date.now().toString(),
          text: `已切换到 ${selectedAgent.name}`,
          sender: 'agent',
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        console.error('Failed to initialize agent:', error);
        setMessages([{
          id: Date.now().toString(),
          text: error instanceof Error ? error.message : 'Failed to initialize agent',
          sender: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    };

    initializeAgent();
  }, [selectedAgent]);

  const handleAgentSelect = (agent: Agent) => {
    // Validate agent before selection
    if (!agent.name || !agent.description) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Invalid agent configuration',
        sender: 'error',
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    // For contract-based agents, validate address
    if (agent.contractAddress) {
      if (!isValidAddress(agent.contractAddress)) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: 'Invalid contract address',
          sender: 'error',
          timestamp: new Date().toISOString()
        }]);
        return;
      }

      // Get agent/workflow details from store
      const storedAgent = getAgent(agent.contractAddress) || getWorkflow(agent.contractAddress);
      if (!storedAgent) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: 'Agent or workflow not found in store',
          sender: 'error',
          timestamp: new Date().toISOString()
        }]);
        return;
      }

      // Use stored agent data to ensure we have latest info
      setSelectedAgent(storedAgent as Agent);
    } else {
      // For built-in agents without contracts
      setSelectedAgent(agent);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Agent Selection Sidebar - 30% width */}
      <Card className="w-[30%]">
        <CardHeader>
          <CardTitle>选择Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedAgentType} onValueChange={setSelectedAgentType}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="official" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                官方Agent
              </TabsTrigger>
              <TabsTrigger value="community" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                社区Agent
              </TabsTrigger>
              <TabsTrigger value="workflow" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Workflow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="official" className="mt-4">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-2">
                  {officialAgents.map((agent) => (
                    <Button
                      key={agent.name}
                      variant={selectedAgent?.name === agent.name ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleAgentSelect(agent)}
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      {agent.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="community" className="mt-4">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-2">
                  {communityAgents.map((agent) => (
                    <Button
                      key={agent.name}
                      variant={selectedAgent?.name === agent.name ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleAgentSelect(agent)}
                    >
                      <Code2 className="h-4 w-4 mr-2" />
                      {agent.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="workflow" className="mt-4">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-2">
                  {workflows.map((workflow) => (
                    <Button
                      key={workflow.name}
                      variant={selectedAgent?.name === workflow.name ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleAgentSelect(workflow as Agent)}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      {workflow.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chat Area - 70% width */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            {selectedAgent?.name || "Chat"}
            {selectedAgent && (
              <span className="text-sm font-normal text-muted-foreground">
                {selectedAgent.description}
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col h-[calc(100vh-16rem)]">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.sender === "error"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-secondary"
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
              className={isRecording ? "text-destructive" : ""}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
