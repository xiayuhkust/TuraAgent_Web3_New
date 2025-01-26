/**
 * Base class for all agentic workflows in the system.
 * Each agent represents a role that can process messages and provide responses.
 */
export class AgenticWorkflow {
  protected name: string;
  protected description: string;
  protected messages: Array<{
    text: string;
    timestamp: string;
    sender: 'user' | 'agent';
  }>;

  /**
   * Create a new AgenticWorkflow instance
   * @param name - The display name of the agent
   * @param description - A description of what this agent does
   */
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.messages = [];  // Store recent messages for context
  }

  /**
   * Process an incoming message and return a response
   * @param text - The message text to process
   * @returns The agent's response
   */
  async processMessage(text: string): Promise<string> {
    // Store message for context
    this.messages.push({
      text,
      timestamp: new Date().toISOString(),
      sender: 'user'
    });

    // Base implementation just echoes the message
    const response = `Received: ${text}`;
    
    // Store response
    this.messages.push({
      text: response,
      timestamp: new Date().toISOString(),
      sender: 'agent'
    });

    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }

    return response;
  }

  /**
   * Get the agent's message history
   * @returns Array of message objects
   */
  getMessages(): Array<{
    text: string;
    timestamp: string;
    sender: 'user' | 'agent';
  }> {
    return this.messages;
  }

  /**
   * Clear the agent's message history
   */
  clearMessages(): void {
    this.messages = [];
  }
}

export default AgenticWorkflow;
