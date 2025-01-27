interface Message {
  text: string;
  timestamp: string;
  sender: 'user' | 'agent';
}

export abstract class AgenticWorkflow {
  public name: string;
  public description: string;
  protected messages: Message[];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.messages = [];
  }

  public async processMessage(text: string): Promise<string> {
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

  public getMessages(): Message[] {
    return this.messages;
  }

  public clearMessages(): void {
    this.messages = [];
  }
}
