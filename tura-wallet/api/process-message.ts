import { OpenAI } from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Load environment variables
import { config } from 'dotenv';
config();

// Initialize API clients
const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  defaultHeaders: { 'Content-Type': 'application/json' }
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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'
});

const VALID_CATEGORIES = [
  'CREATE_WALLET',
  'ACCOUNT_INFO',
  'TRANSFER_TURA',
  'FAUCET_REQUEST',
  'GENERAL_HELP'
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const systemMessage = `You are a wallet assistant that classifies user messages into exactly one category. Respond with ONLY the category name in uppercase with underscores, no other text.

Valid categories:
${VALID_CATEGORIES.join('\n')}

Example mappings:
"Could you make me a new wallet?" -> CREATE_WALLET
"I want to create a wallet" -> CREATE_WALLET
"Help me set up a wallet" -> CREATE_WALLET
"Need a wallet" -> CREATE_WALLET

"How much TURA do I have?" -> ACCOUNT_INFO
"Check my balance" -> ACCOUNT_INFO
"Show wallet info" -> ACCOUNT_INFO
"What's in my account?" -> ACCOUNT_INFO

"Send 10 TURA to 0x..." -> TRANSFER_TURA
"Transfer tokens" -> TRANSFER_TURA
"Pay TURA" -> TRANSFER_TURA
"Send funds" -> TRANSFER_TURA

"I need test tokens" -> FAUCET_REQUEST
"Get TURA from faucet" -> FAUCET_REQUEST
"My balance is low" -> FAUCET_REQUEST
"Can I get some test TURA?" -> FAUCET_REQUEST

For unclear or multiple intents -> GENERAL_HELP

Priority order (highest to lowest):
CREATE_WALLET > FAUCET_REQUEST > TRANSFER_TURA > ACCOUNT_INFO > GENERAL_HELP

Remember: Always respond with exactly one category name in uppercase with underscores, no other text.`;

    // Try DeepSeek first
    let result;
    let usedFallback = false;
    try {
      result = await deepseekClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: text }
        ],
        model: "deepseek-chat",
        temperature: 0,
        max_tokens: 15,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1,
        stop: ["\n", "->", "."]
      });
    } catch (deepseekError) {
      console.warn('DeepSeek API error:', deepseekError);
      try {
        // Fallback to OpenAI
        result = await openaiClient.chat.completions.create({
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: text }
          ],
          model: "gpt-3.5-turbo",
          temperature: 0,
          max_tokens: 15,
          presence_penalty: 0,
          frequency_penalty: 0,
          top_p: 1,
          stop: ["\n", "->", "."]
        });
        usedFallback = true;
      } catch (openaiError) {
        console.error('OpenAI fallback also failed:', openaiError);
        throw new Error(`Both DeepSeek and OpenAI failed: ${deepseekError.message}`);
      }
    }

    const completion = result.choices[0]?.message?.content?.trim().toUpperCase() || '';
    const confidence = completion && VALID_CATEGORIES.includes(completion) ? 1.0 : 0;

    return res.status(200).json({
      intent: completion || 'GENERAL_HELP',
      confidence,
      error: null,
      usedFallback
    });

  } catch (error: any) {
    console.error('DeepSeek API error:', error);
    return res.status(500).json({
      intent: 'GENERAL_HELP',
      confidence: 0,
      error: error?.message || 'Failed to process message'
    });
  }
}
