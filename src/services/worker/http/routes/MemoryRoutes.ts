/**
 * Memory Routes
 *
 * Handles manual memory/observation saving.
 * POST /api/memory/save - Save a manual memory observation
 */

import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { logger } from '../../../../utils/logger.js';
import type { DatabaseManager } from '../../DatabaseManager.js';
import { createBrainEngine, type BrainEngine } from '../../../../engine/brain/engine.js';
import { getProjectAliases } from '../../../../utils/project-name.js';

export class MemoryRoutes extends BaseRouteHandler {
  private brainEngine: BrainEngine | null = null;
  private brainEngineReady: Promise<BrainEngine> | null = null;

  constructor(
    private dbManager: DatabaseManager,
    private defaultProject: string
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.post('/api/memory/save', this.handleSaveMemory.bind(this));
  }

  private async getBrainEngine(): Promise<BrainEngine> {
    if (this.brainEngine) return this.brainEngine;
    if (!this.brainEngineReady) {
      this.brainEngineReady = (async () => {
        const engine = createBrainEngine(this.dbManager.getSessionStore().db);
        await engine.initialize();
        this.brainEngine = engine;
        return engine;
      })();
    }
    return this.brainEngineReady;
  }

  /**
   * POST /api/memory/save - Save a manual memory/observation
   * Body: { text: string, title?: string, project?: string }
   */
  private handleSaveMemory = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { text, title, project } = req.body;
    const targetProject = getProjectAliases(project || this.defaultProject)[0];

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      this.badRequest(res, 'text is required and must be non-empty');
      return;
    }

    const sessionStore = this.dbManager.getSessionStore();

    // 1. Get or create manual session for project
    const memorySessionId = sessionStore.getOrCreateManualSession(targetProject);
    const engine = await this.getBrainEngine();
    const stored = await engine.captureMemory(
      memorySessionId,
      targetProject,
      {
        title: title || text.substring(0, 60).trim() + (text.length > 60 ? '...' : ''),
        narrative: text,
        facts: [],
        concepts: Array.from(new Set(text.toLowerCase().split(/[^a-z0-9_.-]+/).filter(token => token.length >= 4))).slice(0, 12),
        filesRead: [],
        filesModified: [],
      },
      'discovery',
      0.7,
    );

    logger.info('HTTP', 'Manual observation saved', {
      id: stored.id,
      project: targetProject,
      title: stored.content.title
    });

    // 5. Return success
    res.json({
      success: true,
      id: stored.id,
      title: stored.content.title,
      project: targetProject,
      message: `Memory saved as observation #${stored.id}`
    });
  });
}
