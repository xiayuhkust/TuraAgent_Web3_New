import { OpenAI } from 'openai';

interface Message {
  text: string;
  timestamp: string;
  sender: 'user' | 'agent';
  intent?: string;
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

  protected async recognizeIntent(text: string, openai: any): Promise<Intent> {
    // If we're waiting for direct input, bypass intent recognition
    if (this.hasOwnProperty('isWaitingForPassword') || this.hasOwnProperty('isWaitingForFaucetConfirmation')) {
      const agent = this as any;
      if (agent.isWaitingForPassword || agent.isWaitingForFaucetConfirmation) {
        return { name: 'direct_input', confidence: 1.0 };
      }
    }

    try {
      if (!openai) {
        return this.recognizeIntentWithTextMatching(text);
      }

      const result = await openai.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: `You are an intent recognition system. Identify the user's intent from: create_wallet, check_balance, send_tokens, get_test_tokens, unknown. Respond with a JSON object containing 'intent' and 'confidence' fields.` 
          },
          { role: 'user', content: text }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      const completion = JSON.parse(result.choices[0].message.content);
      return {
        name: completion.intent,
        confidence: completion.confidence
      };
    } catch (error) {
      return this.recognizeIntentWithTextMatching(text);
    }
  }

  private recognizeIntentWithTextMatching(text: string): Intent {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('create') && lowerText.includes('wallet')) {
      return { name: 'create_wallet', confidence: 1.0 };
    }
    if (lowerText.includes('balance') || lowerText.includes('how much')) {
      return { name: 'check_balance', confidence: 1.0 };
    }
    if ((lowerText.includes('send') || lowerText.includes('transfer')) && 
        (lowerText.includes('tura') || lowerText.includes('token'))) {
      return { name: 'send_tokens', confidence: 1.0 };
    }
    if (lowerText.includes('faucet') || 
        lowerText.includes('get token') || 
        lowerText.includes('test token') ||
        (lowerText.includes('get') && lowerText.includes('tura'))) {
      return { name: 'get_test_tokens', confidence: 1.0 };
    }
    
    return { name: 'unknown', confidence: 0.0 };
  }

  public async processMessage(text: string): Promise<string> {
    try {
      // Only process if there's actual user input
      if (!text || text.trim() === '') {
        return '';
      }

      let intent;
      
      // Handle direct input if waiting for password or faucet confirmation
      if (this.hasOwnProperty('isWaitingForPassword') || this.hasOwnProperty('isWaitingForFaucetConfirmation')) {
        const agent = this as any;
        if (agent.isWaitingForPassword || agent.isWaitingForFaucetConfirmation) {
          intent = { name: 'direct_input', confidence: 1.0 };
        }
      }
      
      // If not handling direct input, recognize intent
      if (!intent) {
        const openai = new OpenAI({
          apiKey: import.meta.env.VITE_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true
        });
        intent = await this.recognizeIntent(text, openai);
      }
      
      this.agentConversation.push({
        text,
        timestamp: new Date().toISOString(),
        sender: 'user',
        intent: intent.name
      });
      this.saveConversation();

      const response = await this.handleIntent(intent, text);
      
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
