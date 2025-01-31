import { useState, useRef, useEffect } from 'react';
import { Bot, Plus, List, Grid } from 'lucide-react';
import { VirtualWalletSystem as WalletSystem } from '../../lib/virtual-wallet-system';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { AgentManager } from '../../agentic_workflow/AgentManager';
import { agents, workflows, subscribeToAgentStore, getAllAgents } from '../../stores/agent-store';
import { Agent, Workflow } from '../../types/agentTypes';
// Remove VirtualWalletSystem import since we renamed it above
import { TuraWorkflow } from '../../agentic_workflow/TuraWorkflow';
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

const truncateText = (text: string | undefined, maxLength: number) => {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength) + '...';
};

const TRUNCATE_LENGTHS = {
  name: 30,
  description: 100,
  address: 20,
  company: 30,
  fee: 15
};

export default function AgentsPage() {
  const [showAgentStore, setShowAgentStore] = useState(false);
  const [storeTab, setStoreTab] = useState('workflows');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [, setForceRender] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToAgentStore(() => {
      setForceRender(prev => prev + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    success?: string;
    error?: string;
  }>({});
  const [walletSystem] = useState(() => new WalletSystem());
  const longPressTimer = useRef<NodeJS.Timeout>();

  const handleStartWorkflow = async (workflow: Workflow) => {
    const instance = workflow.instance;
    if (instance && instance instanceof TuraWorkflow) {
      await instance.startWorkflow();
    }
  };
  
  const handleTestDeploy = async () => {
    const walletSystem = new WalletSystem();
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
      const contractAddress = await agentManager.deployTestAgent(address, password);
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(mode => mode === 'list' ? 'card' : 'list')}
              className="mr-2"
            >
              {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
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
                const agent = agents.find((a: Agent) => a.contractAddress === agentAddress);
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
            <Tabs defaultValue="workflows" value={storeTab} onValueChange={setStoreTab} className="h-full flex flex-col">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="workflows" className="text-lg">Workflows ({workflows.length})</TabsTrigger>
                <TabsTrigger value="agents" className="text-lg">Agents ({officialAgents.length + agents.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="workflows" className="flex-1 p-4 overflow-auto">
                <div className={viewMode === 'list' ? 'space-y-2' : 'space-y-4'}>
                  {workflows.map((workflow) => (
                    viewMode === 'list' ? (
                      <div
                        key={workflow.contractAddress}
                        className="flex items-center justify-between p-3 border rounded hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{workflow.name}</h3>
                              <div className="px-2 py-0.5 bg-primary/10 text-primary text-sm rounded-full shrink-0">
                                {workflow.status}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{workflow.description}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-sm">
                              <span className="font-mono">{truncateText(workflow.contractAddress, TRUNCATE_LENGTHS.address)}</span>
                            </div>
                            <div className="text-sm font-semibold text-primary shrink-0">
                              {workflow.fee} TURA
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {workflow.instance && workflow.instance instanceof TuraWorkflow && (
                            <div className="flex flex-col">
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-4"
                                onMouseDown={() => {
                                  longPressTimer.current = setTimeout(() => {
                                    if (confirm('Start TuraWorkflow?')) {
                                      handleStartWorkflow(workflow);
                                    }
                                  }, 1000);
                                }}
                                onMouseUp={() => {
                                  if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current);
                                  }
                                }}
                                onMouseLeave={() => {
                                  if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current);
                                  }
                                }}
                              >
                                Start Workflow (Long Press)
                              </Button>
                              <div className="text-xs text-muted-foreground mt-1">
                                Hold the button to start workflow
                              </div>
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="ml-4 shrink-0">
                            Add Workflow
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={workflow.contractAddress}
                        className="p-6 border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-semibold truncate">{workflow.name}</h3>
                              <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full shrink-0">
                                {workflow.status}
                              </div>
                            </div>
                            <p className="text-muted-foreground mb-4 line-clamp-2">{workflow.description}</p>
                            <div className="space-y-2 font-mono text-sm">
                              <p>Contract: {truncateText(workflow.contractAddress, TRUNCATE_LENGTHS.address)}</p>
                              <p>Owner: {truncateText(workflow.owner, TRUNCATE_LENGTHS.address)}</p>
                              <p>Company: {truncateText(workflow.company, TRUNCATE_LENGTHS.company)}</p>
                              <p>Required Confirmations: {workflow.requiredConfirmations}</p>
                              <p className="text-primary font-semibold">
                                Fee: {workflow.fee} TURA
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {workflow.instance && workflow.instance instanceof TuraWorkflow && (
                              <div className="flex flex-col">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="min-w-[100px]"
                                  onMouseDown={() => {
                                    longPressTimer.current = setTimeout(() => {
                                      if (confirm('Start TuraWorkflow?')) {
                                        handleStartWorkflow(workflow);
                                      }
                                    }, 1000);
                                  }}
                                  onMouseUp={() => {
                                    if (longPressTimer.current) {
                                      clearTimeout(longPressTimer.current);
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    if (longPressTimer.current) {
                                      clearTimeout(longPressTimer.current);
                                    }
                                  }}
                                >
                                  Start Workflow (Long Press)
                                </Button>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Hold the button to start workflow
                                </div>
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="min-w-[100px]">
                              Add Workflow
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="agents" className="flex-1 p-4 overflow-auto">
                <div className={viewMode === 'list' ? 'space-y-2' : 'space-y-4'}>
                  {getAllAgents().map((agent) => (
                    viewMode === 'list' ? (
                      <div
                        key={agent.contractAddress}
                        className="flex items-center justify-between p-3 border rounded hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{agent.name}</h3>
                              <div className="px-2 py-0.5 bg-primary/10 text-primary text-sm rounded-full shrink-0">
                                {agent.status}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{agent.description}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-sm">
                              <span className="font-mono">{truncateText(agent.contractAddress, TRUNCATE_LENGTHS.address)}</span>
                            </div>
                            <div className="text-sm font-semibold text-primary shrink-0">
                              {agent.feePerRequest} TURA
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4 shrink-0"
                          onClick={() => handleAddAgent(agent.contractAddress)}
                        >
                          {selectedAgents.includes(agent.contractAddress) ? 'Remove' : 'Add'}
                        </Button>
                      </div>
                    ) : (
                      <div
                        key={agent.contractAddress}
                        className="p-6 border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-semibold truncate">{agent.name}</h3>
                              <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full shrink-0">
                                {agent.status}
                              </div>
                            </div>
                            <p className="text-muted-foreground mb-4 line-clamp-2">{agent.description}</p>
                            <div className="space-y-2 font-mono text-sm">
                              <p>Contract: {truncateText(agent.contractAddress, TRUNCATE_LENGTHS.address)}</p>
                              <p>Owner: {truncateText(agent.owner, TRUNCATE_LENGTHS.address)}</p>
                              <p>Company: {truncateText(agent.company, TRUNCATE_LENGTHS.company)}</p>
                              {'multiSigAddress' in agent && agent.multiSigAddress && (
                                <p>MultiSig: {truncateText(agent.multiSigAddress, TRUNCATE_LENGTHS.address)}</p>
                              )}
                              <p className="text-primary font-semibold">
                                Fee: {agent.feePerRequest} TURA
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-[100px] shrink-0"
                            onClick={() => handleAddAgent(agent.contractAddress)}
                          >
                            {selectedAgents.includes(agent.contractAddress) ? 'Remove Agent' : 'Add Agent'}
                          </Button>
                        </div>
                      </div>
                    )
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
