import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Wallet, Code2, Bot } from 'lucide-react';
import ChatPage from "./components/pages/ChatPage";
import WalletPage from "./components/pages/WalletPage";
import WorkflowPage from "./components/pages/WorkflowPage";
import AgentsPage from "./components/pages/AgentsPage";

function App() {
  const [activeTab, setActiveTab] = useState('wallet');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="wallet" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <ChatPage />
          </TabsContent>

          <TabsContent value="wallet">
            <WalletPage />
          </TabsContent>

          <TabsContent value="workflow">
            <WorkflowPage />
          </TabsContent>

          <TabsContent value="agents">
            <AgentsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
