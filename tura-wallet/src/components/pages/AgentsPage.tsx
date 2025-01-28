"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentsPage;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("../ui/button");
const card_1 = require("../ui/card");
const dialog_1 = require("../ui/dialog");
const tabs_1 = require("../ui/tabs");
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
function AgentsPage() {
    const [showAgentStore, setShowAgentStore] = (0, react_1.useState)(false);
    const [storeTab, setStoreTab] = (0, react_1.useState)('agents');
    const [selectedAgents, setSelectedAgents] = (0, react_1.useState)([]);
    const handleAddAgent = (contractAddress) => {
        setSelectedAgents(prev => prev.includes(contractAddress)
            ? prev.filter(addr => addr !== contractAddress)
            : [...prev, contractAddress]);
    };
    return (<div className="container mx-auto p-4">
      <card_1.Card>
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <card_1.CardTitle>Available Agents</card_1.CardTitle>
          <button_1.Button onClick={() => setShowAgentStore(true)}>
            <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
            Add Agent
          </button_1.Button>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            {selectedAgents.length > 0 ? (selectedAgents.map(agentAddress => {
            const agent = availableAgents.find(a => a.contractAddress === agentAddress);
            if (!agent)
                return null;
            return (<div key={agent.contractAddress} className="p-4 border rounded-lg hover:border-primary transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <lucide_react_1.Bot className="h-4 w-4"/>
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
                      <button_1.Button variant="outline" size="sm" className="min-w-[100px]" onClick={() => handleAddAgent(agent.contractAddress)}>
                        Remove Agent
                      </button_1.Button>
                    </div>
                  </div>);
        })) : (<div className="text-center py-8 text-muted-foreground">
                No agents added. Click "Add Agent" to get started.
              </div>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <dialog_1.Dialog open={showAgentStore} onOpenChange={setShowAgentStore}>
        <dialog_1.DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle className="text-2xl font-bold">Agent Store</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Browse and add agents to your workspace
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="flex-1 overflow-hidden">
            <tabs_1.Tabs defaultValue="agents" value={storeTab} onValueChange={setStoreTab} className="h-full flex flex-col">
              <tabs_1.TabsList className="w-full grid grid-cols-3">
                <tabs_1.TabsTrigger value="agents" className="text-lg">Agents</tabs_1.TabsTrigger>
                <tabs_1.TabsTrigger value="workflows" className="text-lg">Workflows</tabs_1.TabsTrigger>
                <tabs_1.TabsTrigger value="official" className="text-lg">Official Agents</tabs_1.TabsTrigger>
              </tabs_1.TabsList>
              
              <tabs_1.TabsContent value="agents" className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {availableAgents.map((agent) => (<div key={agent.contractAddress} className="p-6 border rounded-lg hover:border-primary transition-colors">
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
                        <button_1.Button variant="outline" size="sm" className="min-w-[100px]" onClick={() => handleAddAgent(agent.contractAddress)}>
                          {selectedAgents.includes(agent.contractAddress) ? 'Remove Agent' : 'Add Agent'}
                        </button_1.Button>
                      </div>
                    </div>))}
                </div>
              </tabs_1.TabsContent>

              <tabs_1.TabsContent value="workflows" className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {availableWorkflows.map((workflow) => (<div key={workflow.contractAddress} className="p-6 border rounded-lg hover:border-primary transition-colors">
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
                        <button_1.Button variant="outline" size="sm" className="min-w-[100px]">
                          Add Workflow
                        </button_1.Button>
                      </div>
                    </div>))}
                </div>
              </tabs_1.TabsContent>

              <tabs_1.TabsContent value="official" className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {officialAgents.map((agent) => (<div key={agent.name} className="p-6 border rounded-lg hover:border-primary transition-colors">
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
                        <button_1.Button variant="outline" size="sm" className="min-w-[100px]">
                          Add Agent
                        </button_1.Button>
                      </div>
                    </div>))}
                </div>
              </tabs_1.TabsContent>
            </tabs_1.Tabs>
          </div>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
