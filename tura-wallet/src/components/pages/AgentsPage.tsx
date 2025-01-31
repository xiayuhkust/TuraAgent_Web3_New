import { useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import { VirtualWalletSystem } from '../../lib/virtual-wallet-system';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { AgentManager } from '../../agentic_workflow/AgentManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';

// Mock data - replace with actual data source later
const availableAgents = [
  {
    name: 'Smart Contract Agent',
    description: 'Helps with smart contract deployment and interaction',
    contractAddress: '0x1234...5678',
    owner: '0xabcd...efgh',
    multiSigAddress: '0x9876...5432',
    feePerRequest: '0.1',
    status: 'Active'
  },
  // Add more mock agents as needed
];

const availableWorkflows = [
  {
    name: 'Token Transfer',
    description: 'Automated token transfer workflow',
    contractAddress: '0x2345...6789',
    owner: '0xbcde...fghi',
    requiredConfirmations: 2,
    turaToken: '0x3456...7890',
    usdtToken: '0x4567...8901',
    fee: '0.05',
    status: 'Active'
  },
  // Add more mock workflows as needed
];

const officialAgents = [
  {
    name: 'Tura Official Agent',
    description: 'Official Tura network agent',
    feePerRequest: '0.01',
    chainId: 1337,
    status: 'Verified'
  },
  // Add more official agents as needed
];

export default function AgentsPage() {
  const [showAgentStore, setShowAgentStore] = useState(false);
  const [storeTab, setStoreTab] = useState('agents');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    success?: string;
    error?: string;
  }>({});
  const [walletSystem] = useState(() => new VirtualWalletSystem());
  
  const handleTestDeploy = async () => {
    const walletSystem = new VirtualWalletSystem();
    const address = walletSystem.getCurrentAddress();
    if (!address) {
      setDeploymentStatus({ error: 'Please connect your wallet first' });
      return;
    }
    if (!password) {
      setDeploymentStatus({ error: 'Please enter your wallet password' });
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus({});
    
    try {
      const agentManager = new AgentManager();
      const contractAddress = await agentManager.deployTestAgent(address);
      console.log('Test agent deployed at:', contractAddress);
      setDeploymentStatus({ success: contractAddress });
      setPassword('');
    } catch (error) {
      console.error('Test deployment failed:', error);
      setDeploymentStatus({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAddAgent = (contractAddress: string) => {
    setSelectedAgents(prev => 
      prev.includes(contractAddress)
        ? prev.filter(addr => addr !== contractAddress)
        : [...prev, contractAddress]
    );
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Available Agents</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Wallet Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-48"
                />
                <Button 
                  onClick={handleTestDeploy}
                  disabled={isDeploying || !walletSystem.getCurrentAddress()}
                >
                  {isDeploying ? 'Deploying...' : 'Test Deploy Agent'}
                </Button>
                <Button onClick={() => setShowAgentStore(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </div>
              {deploymentStatus.error && (
                <span className="text-red-500 text-sm">{deploymentStatus.error}</span>
              )}
              {deploymentStatus.success && (
                <span className="text-green-500 text-sm">
                  Successfully deployed agent at: {deploymentStatus.success}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedAgents.length > 0 ? (
              selectedAgents.map(agentAddress => {
                const agent = availableAgents.find(a => a.contractAddress === agentAddress);
                if (!agent) return null;
                
                return (
                  <div
                    key={agent.contractAddress}
                    className="p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4" />
                          <h3 className="text-lg font-semibold">{agent.name}</h3>
                          <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                            {agent.status}
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4">{agent.description}</p>
                        <div className="space-y-2 font-mono text-sm">
                          <p>Contract: {agent.contractAddress}</p>
                          <p>Owner: {agent.owner}</p>
                          <p>MultiSig: {agent.multiSigAddress}</p>
                          <p className="text-primary font-semibold">
                            Fee: {agent.feePerRequest} TURA
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-w-[100px]"
                        onClick={() => handleAddAgent(agent.contractAddress)}
                      >
                        Remove Agent
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No agents added. Click "Add Agent" to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAgentStore} onOpenChange={setShowAgentStore}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Agent Store</DialogTitle>
            <DialogDescription>
              Browse and add agents to your workspace
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="agents" value={storeTab} onValueChange={setStoreTab} className="h-full flex flex-col">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="agents" className="text-lg">Agents</TabsTrigger>
                <TabsTrigger value="workflows" className="text-lg">Workflows</TabsTrigger>
                <TabsTrigger value="official" className="text-lg">Official Agents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="agents" className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.contractAddress}
                      className="p-6 border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{agent.name}</h3>
                            <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                              {agent.status}
                            </div>
                          </div>
                          <p className="text-muted-foreground mb-4">{agent.description}</p>
                          <div className="space-y-2 font-mono text-sm">
                            <p>Contract: {agent.contractAddress}</p>
                            <p>Owner: {agent.owner}</p>
                            <p>MultiSig: {agent.multiSigAddress}</p>
                            <p className="text-primary font-semibold">
                              Fee: {agent.feePerRequest} TURA
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[100px]"
                          onClick={() => handleAddAgent(agent.contractAddress)}
                        >
                          {selectedAgents.includes(agent.contractAddress) ? 'Remove Agent' : 'Add Agent'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="workflows" className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {availableWorkflows.map((workflow) => (
                    <div
                      key={workflow.contractAddress}
                      className="p-6 border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{workflow.name}</h3>
                            <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                              {workflow.status}
                            </div>
                          </div>
                          <p className="text-muted-foreground mb-4">{workflow.description}</p>
                          <div className="space-y-2 font-mono text-sm">
                            <p>Contract: {workflow.contractAddress}</p>
                            <p>Owner: {workflow.owner}</p>
                            <p>Required Confirmations: {workflow.requiredConfirmations}</p>
                            <p>TURA Token: {workflow.turaToken}</p>
                            <p>USDT Token: {workflow.usdtToken}</p>
                            <p className="text-primary font-semibold">
                              Fee: {workflow.fee} TURA
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="min-w-[100px]">
                          Add Workflow
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="official" className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {officialAgents.map((agent) => (
                    <div
                      key={agent.name}
                      className="p-6 border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{agent.name}</h3>
                            <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                              {agent.status}
                            </div>
                          </div>
                          <p className="text-muted-foreground mb-4">{agent.description}</p>
                          <div className="space-y-2 font-mono text-sm">
                            <p>Fee: {agent.feePerRequest}</p>
                            <p>Chain ID: {agent.chainId}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="min-w-[100px]">
                          Add Agent
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
