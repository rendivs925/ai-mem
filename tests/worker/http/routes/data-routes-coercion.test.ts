/**
 * DataRoutes Type Coercion Tests
 *
 * Tests that MCP clients sending string-encoded arrays for `ids` and
 * `memorySessionIds` are properly coerced before validation.
 *
 * Mock Justification:
 * - Express req/res mocks: Required because route handlers expect Express objects
 * - DatabaseManager/SessionStore: Avoids database setup; we test coercion logic, not queries
 * - Logger spies: Suppress console output during tests
 */

import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import type { Request, Response } from 'express';
import { logger } from '../../../../src/utils/logger.js';

// Mock dependencies before importing DataRoutes
mock.module('../../../../src/shared/paths.js', () => ({
  getPackageRoot: () => '/tmp/test',
}));
mock.module('../../../../src/shared/worker-utils.js', () => ({
  getWorkerPort: () => 37777,
}));
mock.module('fs', () => ({
  readFileSync: () => JSON.stringify({ version: '0.1.0-test' }),
  statSync: () => ({ size: 4096 }),
  existsSync: () => true,
}));
mock.module('../../../../src/engine/brain/engine.js', () => ({
  createBrainEngine: () => ({
    initialize: async () => {},
    getStats: async () => ({
      total: 7,
      avgActivation: 0.42,
      byTier: { sensory: 1, working: 0, episodic: 2, semantic: 3, procedural: 1 },
      committed: 4,
      evidence: 3,
      distilled: 2,
      topSignals: ['architecture', 'workflow', 'constraint'],
    }),
  }),
}));

import { DataRoutes } from '../../../../src/services/worker/http/routes/DataRoutes.js';

let loggerSpies: ReturnType<typeof spyOn>[] = [];

// Helper to create mock req/res
function createMockReqRes(body: any): { req: Partial<Request>; res: Partial<Response>; jsonSpy: ReturnType<typeof mock>; statusSpy: ReturnType<typeof mock> } {
  const jsonSpy = mock(() => {});
  const statusSpy = mock(() => ({ json: jsonSpy }));
  return {
    req: { body, path: '/test', query: {} } as Partial<Request>,
    res: { json: jsonSpy, status: statusSpy } as unknown as Partial<Response>,
    jsonSpy,
    statusSpy,
  };
}

describe('DataRoutes Type Coercion', () => {
  let routes: DataRoutes;
  let mockGetObservationsByIds: ReturnType<typeof mock>;
  let mockGetSdkSessionsBySessionIds: ReturnType<typeof mock>;
  let mockDbPrepare: ReturnType<typeof mock>;
  let mockGetObservationById: ReturnType<typeof mock>;
  let mockStoreObservation: ReturnType<typeof mock>;
  let mockUpdateObservation: ReturnType<typeof mock>;
  let mockDeleteObservation: ReturnType<typeof mock>;
  let mockGetStoredSessionSummaryById: ReturnType<typeof mock>;
  let mockStoreSummary: ReturnType<typeof mock>;
  let mockUpdateSessionSummary: ReturnType<typeof mock>;
  let mockDeleteSessionSummary: ReturnType<typeof mock>;
  let mockSaveUserPrompt: ReturnType<typeof mock>;
  let mockUpdateUserPrompt: ReturnType<typeof mock>;
  let mockDeleteUserPrompt: ReturnType<typeof mock>;
  let mockGetUserPromptsByIds: ReturnType<typeof mock>;

  beforeEach(() => {
    loggerSpies = [
      spyOn(logger, 'info').mockImplementation(() => {}),
      spyOn(logger, 'debug').mockImplementation(() => {}),
      spyOn(logger, 'warn').mockImplementation(() => {}),
      spyOn(logger, 'error').mockImplementation(() => {}),
      spyOn(logger, 'failure').mockImplementation(() => {}),
    ];

    mockGetObservationsByIds = mock(() => [{ id: 1 }, { id: 2 }]);
    mockGetSdkSessionsBySessionIds = mock(() => [{ id: 'abc' }]);
    mockGetObservationById = mock((id: number) => id === 99 ? null : ({ id, title: 'obs' }));
    mockStoreObservation = mock(() => ({ id: 11 }));
    mockUpdateObservation = mock(() => true);
    mockDeleteObservation = mock(() => true);
    mockGetStoredSessionSummaryById = mock((id: number) => id === 99 ? null : ({ id, learned: 'summary' }));
    mockStoreSummary = mock(() => ({ id: 21 }));
    mockUpdateSessionSummary = mock(() => true);
    mockDeleteSessionSummary = mock(() => true);
    mockSaveUserPrompt = mock(() => 31);
    mockUpdateUserPrompt = mock(() => true);
    mockDeleteUserPrompt = mock(() => true);
    mockGetUserPromptsByIds = mock((ids: number[]) => ids[0] === 99 ? [] : [{ id: ids[0], prompt_text: 'prompt', prompt_number: 1 }]);
    mockDbPrepare = mock((sql: string) => ({
      get: () => {
        if (sql.includes('FROM observations')) return { count: 12 };
        if (sql.includes('FROM sdk_sessions')) return { count: 5 };
        if (sql.includes('FROM session_summaries')) return { count: 3 };
        return { count: 0 };
      }
    }));

    const mockDbManager = {
      getSessionStore: () => ({
        db: { prepare: mockDbPrepare },
        getObservationById: mockGetObservationById,
        getObservationsByIds: mockGetObservationsByIds,
        storeObservation: mockStoreObservation,
        updateObservation: mockUpdateObservation,
        deleteObservation: mockDeleteObservation,
        getStoredSessionSummaryById: mockGetStoredSessionSummaryById,
        storeSummary: mockStoreSummary,
        updateSessionSummary: mockUpdateSessionSummary,
        deleteSessionSummary: mockDeleteSessionSummary,
        getSdkSessionsBySessionIds: mockGetSdkSessionsBySessionIds,
        saveUserPrompt: mockSaveUserPrompt,
        updateUserPrompt: mockUpdateUserPrompt,
        deleteUserPrompt: mockDeleteUserPrompt,
        getUserPromptsByIds: mockGetUserPromptsByIds,
      }),
    };

    routes = new DataRoutes(
      {} as any, // paginationHelper
      mockDbManager as any,
      { getActiveSessionCount: () => 2 } as any, // sessionManager
      { getClientCount: () => 4 } as any, // sseBroadcaster
      {} as any, // workerService
      Date.now()
    );
  });

  afterEach(() => {
    loggerSpies.forEach(spy => spy.mockRestore());
    mock.restore();
  });

  describe('handleGetObservationsByIds — ids coercion', () => {
    // Access the handler via setupRoutes
    let handler: (req: Request, res: Response) => void;

    beforeEach(() => {
      const mockApp = {
        get: mock(() => {}),
        post: mock((path: string, fn: any) => {
          if (path === '/api/observations/batch') handler = fn;
        }),
        patch: mock(() => {}),
        delete: mock(() => {}),
      };
      routes.setupRoutes(mockApp as any);
    });

    it('should accept a native array of numbers', () => {
      const { req, res, jsonSpy } = createMockReqRes({ ids: [1, 2, 3] });
      handler(req as Request, res as Response);

      expect(mockGetObservationsByIds).toHaveBeenCalledWith([1, 2, 3], expect.anything());
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should coerce a JSON-encoded string array "[1,2,3]" to native array', () => {
      const { req, res, jsonSpy } = createMockReqRes({ ids: '[1,2,3]' });
      handler(req as Request, res as Response);

      expect(mockGetObservationsByIds).toHaveBeenCalledWith([1, 2, 3], expect.anything());
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should coerce a comma-separated string "1,2,3" to native array', () => {
      const { req, res, jsonSpy } = createMockReqRes({ ids: '1,2,3' });
      handler(req as Request, res as Response);

      expect(mockGetObservationsByIds).toHaveBeenCalledWith([1, 2, 3], expect.anything());
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should reject non-integer values after coercion', () => {
      const { req, res, statusSpy } = createMockReqRes({ ids: 'foo,bar' });
      handler(req as Request, res as Response);

      // NaN values should fail the Number.isInteger check
      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it('should reject missing ids', () => {
      const { req, res, statusSpy } = createMockReqRes({});
      handler(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it('should return empty array for empty ids array', () => {
      const { req, res, jsonSpy } = createMockReqRes({ ids: [] });
      handler(req as Request, res as Response);

      expect(jsonSpy).toHaveBeenCalledWith([]);
    });
  });

  describe('handleGetSdkSessionsByIds — memorySessionIds coercion', () => {
    let handler: (req: Request, res: Response) => void;

    beforeEach(() => {
      const mockApp = {
        get: mock(() => {}),
        post: mock((path: string, fn: any) => {
          if (path === '/api/sdk-sessions/batch') handler = fn;
        }),
        patch: mock(() => {}),
        delete: mock(() => {}),
      };
      routes.setupRoutes(mockApp as any);
    });

    it('should accept a native array of strings', () => {
      const { req, res, jsonSpy } = createMockReqRes({ memorySessionIds: ['abc', 'def'] });
      handler(req as Request, res as Response);

      expect(mockGetSdkSessionsBySessionIds).toHaveBeenCalledWith(['abc', 'def']);
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should coerce a JSON-encoded string array to native array', () => {
      const { req, res, jsonSpy } = createMockReqRes({ memorySessionIds: '["abc","def"]' });
      handler(req as Request, res as Response);

      expect(mockGetSdkSessionsBySessionIds).toHaveBeenCalledWith(['abc', 'def']);
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should coerce a comma-separated string to native array', () => {
      const { req, res, jsonSpy } = createMockReqRes({ memorySessionIds: 'abc,def' });
      handler(req as Request, res as Response);

      expect(mockGetSdkSessionsBySessionIds).toHaveBeenCalledWith(['abc', 'def']);
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should trim whitespace from comma-separated values', () => {
      const { req, res, jsonSpy } = createMockReqRes({ memorySessionIds: 'abc, def , ghi' });
      handler(req as Request, res as Response);

      expect(mockGetSdkSessionsBySessionIds).toHaveBeenCalledWith(['abc', 'def', 'ghi']);
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should reject non-array, non-string values', () => {
      const { req, res, statusSpy } = createMockReqRes({ memorySessionIds: 42 });
      handler(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
    });
  });

  describe('handleGetStats', () => {
    let handler: (req: Request, res: Response) => Promise<void>;

    beforeEach(() => {
      const mockApp = {
        get: mock((path: string, fn: any) => {
          if (path === '/api/stats') handler = fn;
        }),
        post: mock(() => {}),
        patch: mock(() => {}),
        delete: mock(() => {}),
      };
      routes.setupRoutes(mockApp as any);
    });

    it('returns worker, database, and brain-memory quality stats', async () => {
      const jsonSpy = mock(() => {});
      const statusSpy = mock(() => ({ json: jsonSpy }));
      const req = { path: '/api/stats', query: {} } as Partial<Request>;
      const res = { json: jsonSpy, status: statusSpy, headersSent: false } as unknown as Response;

      handler(req as Request, res);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(jsonSpy).toHaveBeenCalledTimes(1);
      expect(statusSpy).not.toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        worker: expect.objectContaining({
          version: '0.1.0-test',
          activeSessions: 2,
          sseClients: 4,
          port: 37777,
        }),
        database: expect.objectContaining({
          size: 4096,
          observations: 12,
          sessions: 5,
          summaries: 3,
        }),
        memory: expect.objectContaining({
          total: 7,
          avgActivation: 0.42,
          committed: 4,
          evidence: 3,
          distilled: 2,
          topSignals: ['architecture', 'workflow', 'constraint'],
        }),
      }));
    });
  });

  describe('CRUD route registration and behavior', () => {
    let handlers: Record<string, (req: Request, res: Response) => void>;

    beforeEach(() => {
      handlers = {};
      const mockApp = {
        get: mock((path: string, fn: any) => { handlers[`GET ${path}`] = fn; }),
        post: mock((path: string, fn: any) => { handlers[`POST ${path}`] = fn; }),
        patch: mock((path: string, fn: any) => { handlers[`PATCH ${path}`] = fn; }),
        delete: mock((path: string, fn: any) => { handlers[`DELETE ${path}`] = fn; }),
      };
      routes.setupRoutes(mockApp as any);
    });

    it('creates observation records through the store', () => {
      const jsonSpy = mock(() => {});
      const statusSpy = mock(() => ({ json: jsonSpy }));
      handlers['POST /api/observations']({
        body: {
          memory_session_id: 'mem-1',
          project: 'proj',
          type: 'discovery',
          title: 'obs title',
          facts: ['a'],
          concepts: ['b'],
        },
        path: '/api/observations',
      } as Request, { json: jsonSpy, status: statusSpy } as unknown as Response);

      expect(mockStoreObservation).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }));
    });

    it('updates and deletes observation records through the store', () => {
      const jsonSpy = mock(() => {});
      handlers['PATCH /api/observation/:id']({
        params: { id: '11' },
        body: { title: 'updated' },
        path: '/api/observation/11',
      } as unknown as Request, { json: jsonSpy, status: mock(() => ({ json: jsonSpy })) } as unknown as Response);
      expect(mockUpdateObservation).toHaveBeenCalledWith(11, { title: 'updated' });

      handlers['DELETE /api/observation/:id']({
        params: { id: '11' },
        path: '/api/observation/11',
      } as unknown as Request, { json: jsonSpy, status: mock(() => ({ json: jsonSpy })) } as unknown as Response);
      expect(mockDeleteObservation).toHaveBeenCalledWith(11);
    });

    it('creates, updates, and deletes summaries through the store', () => {
      const jsonSpy = mock(() => {});
      const statusSpy = mock(() => ({ json: jsonSpy }));
      handlers['POST /api/summaries']({
        body: { memory_session_id: 'mem-1', project: 'proj', request: 'req' },
        path: '/api/summaries',
      } as Request, { json: jsonSpy, status: statusSpy } as unknown as Response);
      expect(mockStoreSummary).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(201);

      handlers['PATCH /api/summary/:id']({
        params: { id: '21' },
        body: { learned: 'updated' },
        path: '/api/summary/21',
      } as unknown as Request, { json: jsonSpy, status: mock(() => ({ json: jsonSpy })) } as unknown as Response);
      expect(mockUpdateSessionSummary).toHaveBeenCalledWith(21, { learned: 'updated' });

      handlers['DELETE /api/summary/:id']({
        params: { id: '21' },
        path: '/api/summary/21',
      } as unknown as Request, { json: jsonSpy, status: mock(() => ({ json: jsonSpy })) } as unknown as Response);
      expect(mockDeleteSessionSummary).toHaveBeenCalledWith(21);
    });

    it('creates, updates, and deletes prompts through the store', () => {
      const jsonSpy = mock(() => {});
      const statusSpy = mock(() => ({ json: jsonSpy }));
      handlers['POST /api/prompts']({
        body: { content_session_id: 'content-1', prompt_number: 1, prompt_text: 'hello' },
        path: '/api/prompts',
      } as Request, { json: jsonSpy, status: statusSpy } as unknown as Response);
      expect(mockSaveUserPrompt).toHaveBeenCalledWith('content-1', 1, 'hello');
      expect(statusSpy).toHaveBeenCalledWith(201);

      handlers['PATCH /api/prompt/:id']({
        params: { id: '31' },
        body: { prompt_text: 'updated' },
        path: '/api/prompt/31',
      } as unknown as Request, { json: jsonSpy, status: mock(() => ({ json: jsonSpy })) } as unknown as Response);
      expect(mockUpdateUserPrompt).toHaveBeenCalledWith(31, { prompt_number: undefined, prompt_text: 'updated' });

      handlers['DELETE /api/prompt/:id']({
        params: { id: '31' },
        path: '/api/prompt/31',
      } as unknown as Request, { json: jsonSpy, status: mock(() => ({ json: jsonSpy })) } as unknown as Response);
      expect(mockDeleteUserPrompt).toHaveBeenCalledWith(31);
    });
  });
});
