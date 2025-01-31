interface Message {
  text: string;
  timestamp: string;
  sender: 'user' | 'agent';
}

export interface Intent {
  name: string;
  confidence: number;
}

export abstract class AgenticWorkflow {
  public name: string;
  public description: string;
  protected agentConversation: Message[];
  private readonly storageKey: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.storageKey = `agent_conversation_${name.toLowerCase().replace(/\s+/g, '_')}`;
    this.agentConversation = this.loadConversation();
  }

  private loadConversation(): Message[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private saveConversation(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.agentConversation));
  }

  public async processMessage(text: string): Promise<string> {
    try {
      // Only process if there's actual user input
      if (!text || text.trim() === '') {
        return '';
      }

      this.agentConversation.push({
        text,
        timestamp: new Date().toISOString(),
        sender: 'user'
      });
      this.saveConversation();

      const response = await this.handleIntent({ name: 'unknown', confidence: 0.0 }, text);
      
      this.agentConversation.push({
        text: response,
        timestamp: new Date().toISOString(),
        sender: 'agent'
      });
      this.saveConversation();

      if (this.agentConversation.length > 100) {
        this.agentConversation = this.agentConversation.slice(-100);
        this.saveConversation();
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      const errorResponse = `I encountered an error: ${errorMessage}. Please try again.`;
      
      this.agentConversation.push({
        text: errorResponse,
        timestamp: new Date().toISOString(),
        sender: 'agent'
      });
      this.saveConversation();
      
      return errorResponse;
    }
  }

  protected abstract handleIntent(intent: Intent, text: string): Promise<string>;

  public getMessages(): Message[] {
    return this.agentConversation;
  }

  public clearMessages(): void {
    this.agentConversation = [];
    this.saveConversation();
  }
}
