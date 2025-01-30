import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopBar } from './components/TopBar';
import { MessageSquare, Bot } from 'lucide-react';
import ChatPage from "./components/pages/ChatPage";
import AgentsPage from "./components/pages/AgentsPage";
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { WalletManagerImpl as WalletManager } from './lib/wallet_manager';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const walletManager = new WalletManager();

  useSessionTimeout(5 * 60 * 1000, () => {
    localStorage.removeItem('wallet_session');
    const address = localStorage.getItem('lastWalletAddress');
    if (address) {
      setShowLoginPrompt(true);
    }
  });

  useEffect(() => {
    const checkSession = async () => {
      const session = await walletManager.getSession();
      setShowLoginPrompt(!session && !!localStorage.getItem('lastWalletAddress'));
    };
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Session Expired</h2>
            <p className="mb-4">Please re-enter your wallet password to continue.</p>
            <button 
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
              onClick={() => setShowLoginPrompt(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      <div className="container mx-auto py-8">
        <Tabs defaultValue="chat" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <ChatPage />
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
