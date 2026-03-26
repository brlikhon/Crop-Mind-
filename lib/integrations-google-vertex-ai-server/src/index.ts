import { VertexAI, GenerateContentRequest, GenerateContentResult } from '@google-cloud/vertexai';

// Configuration from environment variables
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'cropmind-apac';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// Initialize Vertex AI
export const vertexAI = new VertexAI({
  project: projectId,
  location: location,
});

// Model configuration
const DEFAULT_MODEL = 'gemini-1.5-flash-002'; // Fast and cost-effective
const FALLBACK_MODEL = 'gemini-1.5-pro-002'; // Higher quality if needed

/**
 * OpenAI-compatible message interface for easy migration
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI-compatible completion parameters
 */
export interface ChatCompletionParams {
  model?: string;
  messages: ChatMessage[];
  max_completion_tokens?: number;
  temperature?: number;
}

/**
 * OpenAI-compatible response format
 */
export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Convert OpenAI-style messages to Gemini format
 * Gemini doesn't have a separate "system" role, so we prepend system messages to the first user message
 */
function convertMessagesToGeminiFormat(messages: ChatMessage[]): string {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  let prompt = '';

  // Add system messages as context
  if (systemMessages.length > 0) {
    prompt += systemMessages.map(m => m.content).join('\n\n') + '\n\n---\n\n';
  }

  // Add conversation messages
  prompt += conversationMessages
    .map(m => {
      const roleLabel = m.role === 'user' ? 'User' : 'Assistant';
      return `${roleLabel}: ${m.content}`;
    })
    .join('\n\n');

  return prompt;
}

/**
 * Create a chat completion using Vertex AI Gemini
 * This function provides an OpenAI-compatible interface for easy migration
 */
export async function createChatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletionResponse> {
  const modelName = params.model || DEFAULT_MODEL;
  
  try {
    const model = vertexAI.getGenerativeModel({
      model: modelName,
    });

    const prompt = convertMessagesToGeminiFormat(params.messages);

    const request: GenerateContentRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: params.max_completion_tokens || 2048,
        temperature: params.temperature ?? 0.7,
        topP: 0.95,
        topK: 40,
      },
    };

    const result: GenerateContentResult = await model.generateContent(request);
    const response = result.response;

    // Extract text from response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Build OpenAI-compatible response
    return {
      choices: [
        {
          message: {
            content: text,
            role: 'assistant',
          },
          finish_reason: response.candidates?.[0]?.finishReason || 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0, // Vertex AI doesn't provide token counts in the same way
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  } catch (error) {
    console.error('[Vertex AI] Error generating content:', error);
    throw new Error(
      `Vertex AI generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate embeddings using Vertex AI Text Embeddings API
 * Note: This is a placeholder - actual implementation requires @google-cloud/aiplatform
 * For now, we'll throw an error to trigger the deterministic fallback
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: Implement actual Vertex AI embeddings when deployed to Google Cloud
  // For local development, this will trigger the deterministic fallback
  throw new Error('Vertex AI embeddings not available in local development. Use deterministic fallback or deploy to Google Cloud.');
}

/**
 * Batch generate embeddings for multiple texts
 * Note: This is a placeholder - triggers deterministic fallback
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    try {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
    } catch {
      // Will be caught by caller and trigger fallback
      throw new Error('Vertex AI embeddings not available');
    }
  }
  
  return embeddings;
}

/**
 * Health check for Vertex AI connectivity
 */
export async function healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
  try {
    const model = vertexAI.getGenerativeModel({
      model: DEFAULT_MODEL,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });

    if (result.response.candidates && result.response.candidates.length > 0) {
      return {
        status: 'ok',
        message: `Vertex AI connected successfully (project: ${projectId}, location: ${location})`,
      };
    }

    return {
      status: 'error',
      message: 'Vertex AI returned no candidates',
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Vertex AI health check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Export configuration for debugging
export const config = {
  projectId,
  location,
  defaultModel: DEFAULT_MODEL,
};
