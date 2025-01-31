import { AgentData } from '../types/agentTypes';
import { VirtualWalletSystem } from './virtual-wallet-system';

interface AgentStorage {
  agents: AgentData[];
}

/**
 * Read agent data from localStorage
 * @returns {AgentStorage} The stored agent data or empty array if none exists
 */
export function readLocalAgents(): AgentStorage {
  try {
    const walletSystem = new VirtualWalletSystem();
    const address = walletSystem.getCurrentAddress();
    if (!address) return { agents: [] };
    
    const agents = walletSystem.getAgentsByOwner(address);
    return { agents };
  } catch (error) {
    console.error('Error reading agent data from localStorage:', error);
    return { agents: [] };
  }
}

/**
 * Save agent data to localStorage
 * @param {AgentStorage} data The agent data to save
 * @returns {boolean} True if save was successful
 */
export function saveLocalAgents(data: AgentStorage): boolean {
  try {
    const walletSystem = new VirtualWalletSystem();
    return walletSystem.saveAgent(data.agents[data.agents.length - 1]);
  } catch (error) {
    console.error('Error saving agent data to localStorage:', error);
    return false;
  }
}

/**
 * Add a new agent to storage
 * @param {AgentData} agent The agent data to add
 * @returns {boolean} True if addition was successful
 */
/**
 * Validate agent data before storage
 * @param {AgentData} agent The agent data to validate
 * @throws {Error} If validation fails
 */
function validateAgentData(agent: AgentData): void {
  // Check required fields
  if (!agent.name?.trim()) throw new Error('Agent name is required');
  if (!agent.description?.trim()) throw new Error('Agent description is required');
  if (!agent.company?.trim()) throw new Error('Company name is required');
  if (!agent.contractAddress?.trim()) throw new Error('Contract address is required');
  if (!agent.owner?.trim()) throw new Error('Owner address is required');
  
  // Validate contract address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(agent.contractAddress)) {
    throw new Error('Invalid contract address format');
  }
  
  // Validate owner address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(agent.owner)) {
    throw new Error('Invalid owner address format');
  }
  
  // Validate social media URLs if present
  if (agent.socialLinks?.twitter && !agent.socialLinks.twitter.includes('twitter.com/')) {
    throw new Error('Invalid Twitter URL format');
  }
  if (agent.socialLinks?.github && !agent.socialLinks.github.includes('github.com/')) {
    throw new Error('Invalid GitHub URL format');
  }
}

export function addAgent(agent: AgentData): boolean {
  try {
    // Validate agent data
    validateAgentData(agent);
    
    const currentData = readLocalAgents();
    console.log('Current agent data:', currentData);
    
    // Check for duplicate name under same owner
    const isDuplicate = currentData.agents.some(
      existing => existing.name === agent.name && existing.owner === agent.owner
    );
    
    if (isDuplicate) {
      throw new Error('An agent with this name already exists for this owner');
    }
    
    // Add new agent
    currentData.agents.push(agent);
    console.log('Updated agent data:', currentData);
    
    // Save and verify
    const saved = saveLocalAgents(currentData);
    if (saved) {
      // Verify save was successful
      const verifyData = readLocalAgents();
      console.log('Verified saved data:', verifyData);
      return verifyData.agents.some(
        a => a.contractAddress === agent.contractAddress
      );
    }
    return false;
  } catch (error) {
    console.error('Error adding agent:', error);
    return false;
  }
}

/**
 * Get all agents for a specific owner address
 * @param {string} ownerAddress The owner's address
 * @returns {AgentData[]} Array of agents owned by the address
 */
export function getAgentsByOwner(ownerAddress: string): AgentData[] {
  try {
    const currentData = readLocalAgents();
    return currentData.agents.filter(agent => agent.owner === ownerAddress);
  } catch (error) {
    console.error('Error getting agents by owner:', error);
    return [];
  }
}

/**
 * Check if an agent exists by contract address
 * @param {string} contractAddress The contract address to check
 * @returns {boolean} True if agent exists
 */
export function agentExistsByAddress(contractAddress: string): boolean {
  try {
    const currentData = readLocalAgents();
    return currentData.agents.some(agent => agent.contractAddress === contractAddress);
  } catch (error) {
    console.error('Error checking agent existence:', error);
    return false;
  }
}
