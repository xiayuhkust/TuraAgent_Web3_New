/**
 * Base class for all agentic workflows in the system.
 * Each agent represents a role that can process messages and provide responses.
 */
export class AgenticWorkflow {
  /**
   * Create a new AgenticWorkflow instance
   * @param {string} name - The display name of the agent
   * @param {string} description - A description of what this agent does
   */
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.messages = [];  // Store recent messages for context
  }

  /**
   * Process an incoming message and return a response
   * @param {string} text - The message text to process
   * @returns {Promise<string>} The agent's response
   */
  async processMessage(text) {
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
   * @returns {Array} Array of message objects
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Clear the agent's message history
   */
  clearMessages() {
    this.messages = [];
  }
}
