/**
 * Default settings values for Claude Memory
 * Shared across UI components and hooks
 */
export const DEFAULT_SETTINGS = {
  AI_MEM_MODEL: 'claude-sonnet-4-5',
  AI_MEM_CONTEXT_OBSERVATIONS: '50',
  AI_MEM_WORKER_PORT: '37777',
  AI_MEM_WORKER_HOST: '127.0.0.1',

  // AI Provider Configuration
  AI_MEM_PROVIDER: 'claude',
  AI_MEM_GEMINI_API_KEY: '',
  AI_MEM_GEMINI_MODEL: 'gemini-2.5-flash-lite',
  AI_MEM_OPENROUTER_API_KEY: '',
  AI_MEM_OPENROUTER_MODEL: 'xiaomi/mimo-v2-flash:free',
  AI_MEM_OPENROUTER_SITE_URL: '',
  AI_MEM_OPENROUTER_APP_NAME: 'claude-mem',
  AI_MEM_GEMINI_RATE_LIMITING_ENABLED: 'true',

  // Token Economics — match SettingsDefaultsManager defaults (off by default to keep context lean)
  AI_MEM_CONTEXT_SHOW_READ_TOKENS: 'false',
  AI_MEM_CONTEXT_SHOW_WORK_TOKENS: 'false',
  AI_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT: 'false',
  AI_MEM_CONTEXT_SHOW_SAVINGS_PERCENT: 'true',

  // Display Configuration — match SettingsDefaultsManager defaults
  AI_MEM_CONTEXT_FULL_COUNT: '0',
  AI_MEM_CONTEXT_FULL_FIELD: 'narrative',
  AI_MEM_CONTEXT_SESSION_COUNT: '10',

  // Feature Toggles
  AI_MEM_CONTEXT_SHOW_LAST_SUMMARY: 'true',
  AI_MEM_CONTEXT_SHOW_LAST_MESSAGE: 'false',

  // Exclusion Settings
  AI_MEM_EXCLUDED_PROJECTS: '',
  AI_MEM_FOLDER_MD_EXCLUDE: '[]',
} as const;
