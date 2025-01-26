interface Message {
  text: string;
  timestamp: string;
  sender: 'user' | 'agent';
}

/**
 * Base class for all agentic workflows in the system.
 * Each agent represents a role that can process messages and provide responses.
 */
export class AgenticWorkflow {
  private name: string;
  private description: string;
  private messages: Message[] = [];

  /**
   * Create a new AgenticWorkflow instance
   * @param name - The display name of the agent
   * @param description - A description of what this agent does
   */
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
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

    // Base implementation identifies the agent and echoes the message
    const response = `I am ${this.name}. ${this.description ? this.description + '. ' : ''}You said: ${text}`;
    
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
  getMessages(): Message[] {
    return this.messages;
  }

  /**
   * Clear the agent's message history
   */
  clearMessages(): void {
    this.messages = [];
  }
}
