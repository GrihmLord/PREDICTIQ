'use strict';

const secrets = require('./secrets');
const {ContractError} = require('./validate');
const {MAX_PROMPT_CHARS} = require('./contract');

/**
 * Outbound model calls.
 *
 * This runs in the main process for one reason: the API key never enters the
 * renderer. The renderer sends a prompt and receives text; the key is read from
 * the OS keystore here, used, and discarded.
 */

const PROVIDERS = {
  Anthropic: {
    defaultModel: 'claude-opus-5',
    keyHint: 'sk-ant-...',
  },
  OpenAI: {
    defaultModel: 'gpt-4o',
    keyHint: 'sk-...',
  },
};

const REQUEST_TIMEOUT_MS = 120000;
const MAX_OUTPUT_TOKENS = 16000;

class ProviderError extends Error {
  constructor(message, {retryable = false, status = null} = {}) {
    super(message);
    this.name = 'ProviderError';
    this.retryable = retryable;
    this.status = status;
  }
}

function assertPrompt(prompt) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new ContractError('Prompt must be a non-empty string');
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new ContractError('Prompt exceeds the size limit');
  }
  return prompt;
}

function assertProvider(provider) {
  if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) {
    throw new ContractError('Unknown provider: ' + String(provider));
  }
  return PROVIDERS[provider];
}

function loadModule(name) {
  try {
    return require(name);
  } catch (error) {
    throw new ProviderError(
      'The ' +
        name +
        ' package is not installed. Run npm install to enable this provider.',
    );
  }
}

async function callAnthropic({apiKey, model, system, prompt}) {
  const mod = loadModule('@anthropic-ai/sdk');
  const Anthropic = mod.default || mod;
  const client = new Anthropic({apiKey, timeout: REQUEST_TIMEOUT_MS});

  try {
    const response = await client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: {type: 'adaptive'},
      system,
      messages: [{role: 'user', content: prompt}],
    });

    if (response.stop_reason === 'refusal') {
      const category = response.stop_details
        ? response.stop_details.category
        : null;
      throw new ProviderError(
        'The model declined this request' +
          (category ? ' (' + category + ')' : ''),
      );
    }

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    return {
      text,
      model: response.model,
      usage: {
        inputTokens: response.usage ? response.usage.input_tokens : null,
        outputTokens: response.usage ? response.usage.output_tokens : null,
      },
    };
  } catch (error) {
    throw translateAnthropicError(Anthropic, error);
  }
}

function translateAnthropicError(Anthropic, error) {
  if (error instanceof ProviderError) {
    return error;
  }
  if (
    Anthropic.AuthenticationError &&
    error instanceof Anthropic.AuthenticationError
  ) {
    return new ProviderError('The stored Anthropic API key was rejected.', {
      status: 401,
    });
  }
  if (Anthropic.RateLimitError && error instanceof Anthropic.RateLimitError) {
    return new ProviderError('Rate limited by Anthropic. Retry shortly.', {
      retryable: true,
      status: 429,
    });
  }
  if (Anthropic.BadRequestError && error instanceof Anthropic.BadRequestError) {
    return new ProviderError(
      'Anthropic rejected the request: ' + error.message,
      {status: 400},
    );
  }
  if (
    Anthropic.APIConnectionError &&
    error instanceof Anthropic.APIConnectionError
  ) {
    return new ProviderError('Could not reach Anthropic.', {retryable: true});
  }
  if (Anthropic.APIError && error instanceof Anthropic.APIError) {
    return new ProviderError(
      'Anthropic API error ' + error.status + ': ' + error.message,
      {
        retryable: Number(error.status) >= 500,
        status: error.status,
      },
    );
  }
  return new ProviderError(
    'Anthropic call failed: ' +
      (error && error.message ? error.message : 'unknown error'),
  );
}

async function callOpenAI({apiKey, model, system, prompt}) {
  const mod = loadModule('openai');
  const OpenAI = mod.default || mod;
  const client = new OpenAI({apiKey, timeout: REQUEST_TIMEOUT_MS});

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {role: 'system', content: system},
        {role: 'user', content: prompt},
      ],
    });

    const choice = response.choices && response.choices[0];
    return {
      text:
        choice && choice.message
          ? String(choice.message.content || '').trim()
          : '',
      model: response.model,
      usage: {
        inputTokens: response.usage ? response.usage.prompt_tokens : null,
        outputTokens: response.usage ? response.usage.completion_tokens : null,
      },
    };
  } catch (error) {
    const status = error && error.status ? Number(error.status) : null;
    if (status === 401) {
      throw new ProviderError('The stored OpenAI API key was rejected.', {
        status,
      });
    }
    if (status === 429) {
      throw new ProviderError('Rate limited by OpenAI. Retry shortly.', {
        retryable: true,
        status,
      });
    }
    throw new ProviderError(
      'OpenAI call failed: ' +
        (error && error.message ? error.message : 'unknown error'),
      {retryable: status !== null && status >= 500, status},
    );
  }
}

/**
 * Runs one completion against the configured provider.
 * Returns text only; the key never crosses back over IPC.
 */
async function complete({provider, model, system, prompt}) {
  const spec = assertProvider(provider);
  assertPrompt(prompt);

  const apiKey = await secrets.read('aiApiKey');
  if (!apiKey) {
    throw new ProviderError('No API key is configured for ' + provider + '.');
  }

  const resolvedModel =
    typeof model === 'string' && model.trim()
      ? model.trim()
      : spec.defaultModel;
  const resolvedSystem =
    typeof system === 'string' && system.trim()
      ? system.slice(0, MAX_PROMPT_CHARS)
      : 'You are a risk analyst. Answer concisely and factually.';

  if (provider === 'Anthropic') {
    return callAnthropic({
      apiKey,
      model: resolvedModel,
      system: resolvedSystem,
      prompt,
    });
  }
  return callOpenAI({
    apiKey,
    model: resolvedModel,
    system: resolvedSystem,
    prompt,
  });
}

module.exports = {complete, PROVIDERS, ProviderError};
