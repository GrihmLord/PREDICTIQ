// src/services/aiService.ts
// Renderer-side façade for provider calls.
//
// The renderer never holds an API key. It hands a prompt to the main process,
// which reads the key from the OS keystore, makes the call, and returns text.
// Every failure is returned as data rather than thrown, because a provider
// being unavailable must degrade the assessment, not abort it.

import {getBridge, AiCompleteRequest} from './bridge';

export interface SummarizeRequest {
  provider: 'Anthropic' | 'OpenAI';
  model?: string;
  prompt: string;
}

export interface SummarizeResult {
  text: string | null;
  model: string;
  error: string | null;
}

const SYSTEM_PROMPT =
  'You are the synthesis layer of a multi-domain risk assessment console. ' +
  'You receive findings from domain experts and produce a concise executive summary. ' +
  'Never fabricate findings that were not supplied to you.';

class AiService {
  /** True when a key is stored and a provider call could actually be made. */
  async isConfigured(): Promise<boolean> {
    const bridge = getBridge();
    if (!bridge) {
      return false;
    }
    try {
      return await bridge.secrets.has('aiApiKey');
    } catch (error) {
      return false;
    }
  }

  async summarize(request: SummarizeRequest): Promise<SummarizeResult> {
    const bridge = getBridge();
    if (!bridge) {
      return {
        text: null,
        model: request.model || '',
        error: 'Provider calls are only available in the desktop app.',
      };
    }

    const payload: AiCompleteRequest = {
      provider: request.provider,
      model: request.model,
      system: SYSTEM_PROMPT,
      prompt: request.prompt,
    };

    try {
      const response = await bridge.ai.complete(payload);
      return {text: response.text, model: response.model, error: null};
    } catch (error) {
      return {
        text: null,
        model: request.model || '',
        error:
          error instanceof Error ? error.message : 'The provider call failed.',
      };
    }
  }
}

export const aiService = new AiService();
