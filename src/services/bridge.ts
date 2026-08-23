// src/services/bridge.ts
// Typed access to the main-process bridge installed by electron/preload.js.

export type StoreKey =
  | 'predictionHistory'
  | 'userSettings'
  | 'brandTheme'
  | 'authProfile';
export type SecretName = 'aiApiKey' | 'oidcTokens';

export interface SaveFileRequest {
  defaultName: string;
  contents: string;
  /** base64 for binary exports (PDF, PPTX); utf8 otherwise. */
  encoding?: 'utf8' | 'base64';
  filters?: {name: string; extensions: string[]}[];
}

export interface SaveFileResult {
  saved: boolean;
  path: string | null;
}

export interface AiCompleteRequest {
  provider: 'Anthropic' | 'OpenAI';
  model?: string;
  system?: string;
  prompt: string;
}

export interface AiCompleteResult {
  text: string;
  model: string;
  usage: {inputTokens: number | null; outputTokens: number | null};
}

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
}

export interface AuthStatus {
  configured: boolean;
  issuer: string | null;
  authenticated: boolean;
  profile: AuthProfile | null;
  reason?: string;
}

export interface AppInfo {
  version: string;
  platform: string;
  versions: {electron: string; chrome: string; node: string};
  storage: {backend: string; encryptedSecrets: boolean};
}

export interface PredictIQBridge {
  store: {
    get(key: StoreKey): Promise<unknown>;
    set(key: StoreKey, value: unknown): Promise<boolean>;
    delete(key: StoreKey): Promise<boolean>;
  };
  secrets: {
    set(name: SecretName, value: string): Promise<boolean>;
    has(name: SecretName): Promise<boolean>;
    clear(name: SecretName): Promise<boolean>;
  };
  files: {
    save(request: SaveFileRequest): Promise<SaveFileResult>;
  };
  ai: {
    complete(request: AiCompleteRequest): Promise<AiCompleteResult>;
  };
  auth: {
    status(): Promise<AuthStatus>;
    login(): Promise<AuthStatus>;
    logout(): Promise<AuthStatus>;
  };
  app: {
    info(): Promise<AppInfo>;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var predictiq: PredictIQBridge | undefined;
}

/**
 * Returns the bridge when running inside the desktop shell, or null in a plain
 * browser. Callers branch on null rather than assuming a desktop host, which is
 * what lets the same build run as a web app with reduced capability.
 */
export function getBridge(): PredictIQBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const candidate = (window as unknown as {predictiq?: PredictIQBridge})
    .predictiq;
  return candidate && candidate.store ? candidate : null;
}

export function isDesktop(): boolean {
  return getBridge() !== null;
}
