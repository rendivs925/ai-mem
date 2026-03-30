/**
 * Tests for SessionStore in-memory database operations
 *
 * Mock Justification: NONE (0% mock code)
 * - Uses real SQLite with ':memory:' - tests actual SQL and schema
 * - All CRUD operations are tested against real database behavior
 * - Timestamp handling and FK relationships are validated
 *
 * Value: Validates core persistence layer without filesystem dependencies
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SessionStore } from '../src/services/sqlite/SessionStore.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('should correctly count user prompts', () => {
    const claudeId = 'claude-session-1';
    store.createSDKSession(claudeId, 'test-project', 'initial prompt');
    
    // Should be 0 initially
    expect(store.getPromptNumberFromUserPrompts(claudeId)).toBe(0);

    // Save prompt 1
    store.saveUserPrompt(claudeId, 1, 'First prompt');
    expect(store.getPromptNumberFromUserPrompts(claudeId)).toBe(1);

    // Save prompt 2
    store.saveUserPrompt(claudeId, 2, 'Second prompt');
    expect(store.getPromptNumberFromUserPrompts(claudeId)).toBe(2);

    // Save prompt for another session
    store.createSDKSession('claude-session-2', 'test-project', 'initial prompt');
    store.saveUserPrompt('claude-session-2', 1, 'Other prompt');
    expect(store.getPromptNumberFromUserPrompts(claudeId)).toBe(2);
  });

  it('should store observation with timestamp override', () => {
    const claudeId = 'claude-sess-obs';
    const memoryId = 'memory-sess-obs';
    const sdkId = store.createSDKSession(claudeId, 'test-project', 'initial prompt');

    // Set the memory_session_id before storing observations
    // createSDKSession now initializes memory_session_id = NULL
    store.updateMemorySessionId(sdkId, memoryId);

    const obs = {
      type: 'discovery',
      title: 'Test Obs',
      subtitle: null,
      facts: [],
      narrative: 'Testing',
      concepts: [],
      files_read: [],
      files_modified: []
    };

    const pastTimestamp = 1600000000000; // Some time in the past

    const result = store.storeObservation(
      memoryId, // Use memorySessionId for FK reference
      'test-project',
      obs,
      1,
      0,
      pastTimestamp
    );

    expect(result.createdAtEpoch).toBe(pastTimestamp);

    const stored = store.getObservationById(result.id);
    expect(stored).not.toBeNull();
    expect(stored?.created_at_epoch).toBe(pastTimestamp);

    // Verify ISO string matches
    expect(new Date(stored!.created_at).getTime()).toBe(pastTimestamp);
  });

  it('should store summary with timestamp override', () => {
    const claudeId = 'claude-sess-sum';
    const memoryId = 'memory-sess-sum';
    const sdkId = store.createSDKSession(claudeId, 'test-project', 'initial prompt');

    // Set the memory_session_id before storing summaries
    store.updateMemorySessionId(sdkId, memoryId);

    const summary = {
      request: 'Do something',
      investigated: 'Stuff',
      learned: 'Things',
      completed: 'Done',
      next_steps: 'More',
      notes: null
    };

    const pastTimestamp = 1650000000000;

    const result = store.storeSummary(
      memoryId, // Use memorySessionId for FK reference
      'test-project',
      summary,
      1,
      0,
      pastTimestamp
    );

    expect(result.createdAtEpoch).toBe(pastTimestamp);

    const stored = store.getSummaryForSession(memoryId);
    expect(stored).not.toBeNull();
    expect(stored?.created_at_epoch).toBe(pastTimestamp);
  });

  it('should support observation CRUD', () => {
    const contentId = 'claude-crud-obs';
    const memoryId = 'memory-crud-obs';
    const sessionId = store.createSDKSession(contentId, 'test-project', 'initial prompt');
    store.updateMemorySessionId(sessionId, memoryId);

    const created = store.storeObservation(
      memoryId,
      'test-project',
      {
        type: 'discovery',
        title: 'Initial title',
        subtitle: null,
        facts: ['fact-a'],
        narrative: 'Initial narrative',
        concepts: ['crud'],
        files_read: ['a.ts'],
        files_modified: [],
      }
    );

    expect(store.updateObservation(created.id, {
      title: 'Updated title',
      narrative: 'Updated narrative',
      facts: ['fact-b'],
      files_modified: ['b.ts'],
    })).toBe(true);

    const updated = store.getObservationById(created.id);
    expect(updated?.title).toBe('Updated title');
    expect((updated as any)?.narrative).toBe('Updated narrative');
    expect((updated as any)?.facts).toContain('fact-b');
    expect((updated as any)?.files_modified).toContain('b.ts');

    expect(store.deleteObservation(created.id)).toBe(true);
    expect(store.getObservationById(created.id)).toBeNull();
  });

  it('should support summary CRUD', () => {
    const contentId = 'claude-crud-summary';
    const memoryId = 'memory-crud-summary';
    const sessionId = store.createSDKSession(contentId, 'test-project', 'initial prompt');
    store.updateMemorySessionId(sessionId, memoryId);

    const created = store.storeSummary(
      memoryId,
      'test-project',
      {
        request: 'Initial request',
        investigated: 'Initial investigation',
        learned: 'Initial lesson',
        completed: 'Initial completion',
        next_steps: 'Initial next step',
        notes: 'Initial notes',
      }
    );

    expect(store.updateSessionSummary(created.id, {
      learned: 'Updated lesson',
      completed: 'Updated completion',
      notes: 'Updated notes',
    })).toBe(true);

    const updated = store.getStoredSessionSummaryById(created.id);
    expect(updated?.learned).toBe('Updated lesson');
    expect(updated?.completed).toBe('Updated completion');
    expect((updated as any)?.notes).toBe('Updated notes');

    expect(store.deleteSessionSummary(created.id)).toBe(true);
    expect(store.getStoredSessionSummaryById(created.id)).toBeNull();
  });

  it('should support prompt CRUD', () => {
    const contentId = 'claude-crud-prompt';
    store.createSDKSession(contentId, 'test-project', 'initial prompt');

    const promptId = store.saveUserPrompt(contentId, 1, 'Original prompt');
    expect(store.updateUserPrompt(promptId, {
      prompt_number: 2,
      prompt_text: 'Updated prompt',
    })).toBe(true);

    const updated = store.getUserPromptsByIds([promptId])[0];
    expect(updated.prompt_number).toBe(2);
    expect(updated.prompt_text).toBe('Updated prompt');

    expect(store.deleteUserPrompt(promptId)).toBe(true);
    expect(store.getUserPromptsByIds([promptId])).toHaveLength(0);
  });
});
