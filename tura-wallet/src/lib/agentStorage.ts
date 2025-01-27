import { AgentData } from '../types/agentTypes';

const STORAGE_KEY = 'tura_registered_agents';

interface AgentStorage {
  agents: AgentData[];
}

/**
 * Read agent data from localStorage
 * @returns {AgentStorage} The stored agent data or empty array if none exists
 */
export function readLocalAgents(): AgentStorage {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return { agents: [] };
    }
    return JSON.parse(storedData);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
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
export function addAgent(agent: AgentData): boolean {
  try {
    const currentData = readLocalAgents();
    
    // Check for duplicate name under same owner
    const isDuplicate = currentData.agents.some(
      existing => existing.name === agent.name && existing.owner === agent.owner
    );
    
    if (isDuplicate) {
      throw new Error('An agent with this name already exists for this owner');
    }
    
    currentData.agents.push(agent);
    return saveLocalAgents(currentData);
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
