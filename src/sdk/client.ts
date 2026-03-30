/**
 * AI-Mem HTTP Client SDK
 * 
 * Lightweight client for connecting any AI coding tool to ai-mem.
 * Provides typed methods for memory operations over HTTP.
 * 
 * Usage:
 *   import { AiMemClient } from 'ai-mem/sdk/client';
 *   const client = new AiMemClient({ port: 37777 });
 *   const results = await client.search('authentication');
 */

export interface ClientOptions {
  /** Worker host (default: 127.0.0.1) */
  host?: string;
  /** Worker port (default: 37777) */
  port?: number;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
}

export interface Capabilities {
  name: string;
  version: string;
  description: string;
  endpoints: Record<string, { path: string; method: string; description: string }>;
  protocols: string[];
  platforms: string[];
  dataDir: string;
  defaultPort: number;
}

export interface HealthStatus {
  status: string;
  version: string;
  uptime: number;
  initialized: boolean;
  mcpReady: boolean;
  pid: number;
}

export interface SearchResult {
  id: number;
  project: string;
  text: string;
  type: string;
  obsType?: string;
  timestamp: string;
}

export interface MemoryStats {
  total: number;
  avgActivation: number;
  byTier: Record<string, number>;
}

export interface SessionObservation {
  claudeSessionId: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: Record<string, unknown>;
  cwd: string;
}

export interface TimelineEntry {
  id: number;
  timestamp: string;
  project: string;
  type: string;
  text: string;
}

export class AiMemClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: ClientOptions = {}) {
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? 37777;
    this.baseUrl = `http://${host}:${port}`;
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Check if worker is healthy */
  async health(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/api/health');
  }

  /** Check if worker is fully initialized */
  async ready(): Promise<{ status: string; mcpReady: boolean }> {
    return this.request('/api/readiness');
  }

  /** Get worker version */
  async version(): Promise<{ version: string }> {
    return this.request('/api/version');
  }

  /** Get capabilities contract */
  async capabilities(): Promise<Capabilities> {
    return this.request<Capabilities>('/api/capabilities');
  }

  /** Search memories */
  async search(params: {
    query?: string;
    type?: 'observations' | 'sessions' | 'prompts';
    limit?: number;
    project?: string;
    obs_type?: string;
  }): Promise<{ results: SearchResult[] }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.project) searchParams.set('project', params.project);
    if (params.obs_type) searchParams.set('obs_type', params.obs_type);
    
    return this.request(`/api/search?${searchParams}`);
  }

  /** Get timeline context around an anchor */
  async timeline(params: {
    anchor?: number | string;
    query?: string;
    depth_before?: number;
    depth_after?: number;
    project?: string;
  }): Promise<{ entries: TimelineEntry[] }> {
    const searchParams = new URLSearchParams();
    if (params.anchor !== undefined) searchParams.set('anchor', String(params.anchor));
    if (params.query) searchParams.set('query', params.query);
    if (params.depth_before) searchParams.set('depth_before', String(params.depth_before));
    if (params.depth_after) searchParams.set('depth_after', String(params.depth_after));
    if (params.project) searchParams.set('project', params.project);
    
    return this.request(`/api/timeline?${searchParams}`);
  }

  /** Get recent context for a project */
  async recentContext(params: {
    project: string;
    limit?: number;
  }): Promise<{ summaries: unknown[]; observations: unknown[] }> {
    const searchParams = new URLSearchParams();
    searchParams.set('project', params.project);
    if (params.limit) searchParams.set('limit', String(params.limit));
    
    return this.request(`/api/context/recent?${searchParams}`);
  }

  /** Inject context for display */
  async injectContext(params: {
    projects: string | string[];
    colors?: boolean;
    full?: boolean;
  }): Promise<string> {
    const projects = Array.isArray(params.projects) 
      ? params.projects.join(',') 
      : params.projects;
    const searchParams = new URLSearchParams({ projects });
    if (params.colors) searchParams.set('colors', 'true');
    if (params.full) searchParams.set('full', 'true');
    
    const response = await fetch(`${this.baseUrl}/api/context/inject?${searchParams}`);
    return response.text();
  }

  /** Get memory statistics */
  async stats(): Promise<MemoryStats> {
    return this.request<MemoryStats>('/api/stats');
  }

  /** Initialize a session */
  async initSession(params: {
    sessionId: string;
    cwd: string;
    prompt?: string;
  }): Promise<{ success: boolean; sessionDbId?: number }> {
    return this.request('/api/sessions/init', {
      method: 'POST',
      body: JSON.stringify({
        contentSessionId: params.sessionId,
        cwd: params.cwd,
        userPrompt: params.prompt,
      }),
    });
  }

  /** Queue an observation */
  async queueObservation(observation: SessionObservation): Promise<{ status: string }> {
    return this.request('/api/sessions/observations', {
      method: 'POST',
      body: JSON.stringify(observation),
    });
  }

  /** Queue a summary request */
  async queueSummary(params: {
    sessionId: string;
    lastUserMessage: string;
    lastAssistantMessage: string;
  }): Promise<{ status: string }> {
    return this.request('/api/sessions/summarize', {
      method: 'POST',
      body: JSON.stringify({
        claudeSessionId: params.sessionId,
        last_user_message: params.lastUserMessage,
        last_assistant_message: params.lastAssistantMessage,
      }),
    });
  }

  /** Complete a session */
  async completeSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request('/api/sessions/complete', {
      method: 'POST',
      body: JSON.stringify({ claudeSessionId: sessionId }),
    });
  }

  /** Save a manual memory */
  async saveMemory(params: {
    text: string;
    title?: string;
    project?: string;
  }): Promise<{ success: boolean; id: number; title: string }> {
    return this.request('/api/memory/save', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** Get settings */
  async getSettings(): Promise<Record<string, unknown>> {
    return this.request('/api/settings');
  }

  /** Update settings */
  async updateSettings(settings: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }
}

/** Default client instance */
export function createClient(options?: ClientOptions): AiMemClient {
  return new AiMemClient(options);
}
