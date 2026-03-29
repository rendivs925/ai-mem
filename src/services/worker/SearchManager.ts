/**
 * SearchManager - Core search orchestration for claude-mem
 *
 * Coordinates search, timeline, and brain-memory retrieval for the worker API.
 */

import { SessionSearch } from '../sqlite/SessionSearch.js';
import { SessionStore } from '../sqlite/SessionStore.js';
import { ChromaSync } from '../sync/ChromaSync.js';
import { createBrainEngine, type BrainEngine } from '../../engine/brain/engine.js';
import { MemoryTier } from '../../types/brain/memory.js';
import { FormattingService } from './FormattingService.js';
import { TimelineService } from './TimelineService.js';
import type { TimelineItem } from './TimelineService.js';
import type { ObservationSearchResult, SessionSummarySearchResult, UserPromptSearchResult } from '../sqlite/types.js';
import { logger } from '../../utils/logger.js';
import { getProjectAliases, getProjectContext } from '../../utils/project-name.js';
import { formatDate, formatTime, formatDateTime, extractFirstFile, groupByDate, estimateTokens } from '../../shared/timeline-formatting.js';
import { ModeManager } from '../domain/ModeManager.js';
import type { CMU, RetrievalResult } from '../../types/brain/memory.js';

import {
  SearchOrchestrator,
  TimelineBuilder,
  SEARCH_CONSTANTS
} from './search/index.js';
import type { TimelineData } from './search/index.js';

export class SearchManager {
  private orchestrator: SearchOrchestrator;
  private timelineBuilder: TimelineBuilder;
  private brainEngine: BrainEngine | null = null;
  private brainEngineReady: Promise<BrainEngine> | null = null;

  constructor(
    private sessionSearch: SessionSearch,
    private sessionStore: SessionStore,
    private chromaSync: ChromaSync | null,
    private formatter: FormattingService,
    private timelineService: TimelineService
  ) {
    // Initialize the new modular search infrastructure
    this.orchestrator = new SearchOrchestrator(
      sessionSearch,
      sessionStore,
      chromaSync
    );
    this.timelineBuilder = new TimelineBuilder();
  }

  private async getBrainEngine(): Promise<BrainEngine> {
    if (this.brainEngine) return this.brainEngine;
    if (!this.brainEngineReady) {
      this.brainEngineReady = (async () => {
        const engine = createBrainEngine(this.sessionStore.db);
        await engine.initialize();
        this.brainEngine = engine;
        return engine;
      })();
    }
    return this.brainEngineReady;
  }

  private async brainSearch(
    query: string,
    options: { project?: string; limit?: number; tiers?: MemoryTier[] } = {},
  ) {
    const engine = await this.getBrainEngine();
    return engine.retrieveMemories(
      query,
      {
        projects: options.project ? getProjectAliases(options.project) : undefined,
        tiers: options.tiers,
      },
      options.limit || 20,
    );
  }

  private formatBrainResults(results: Awaited<ReturnType<SearchManager['brainSearch']>>, query: string): string {
    if (results.length === 0) {
      return `No brain-memory results found matching "${query}"`;
    }

    return [
      `Brain memory results for "${query}"`,
      '',
      ...results.map((result) =>
        [
          `[${result.cmu.tier}] ${result.cmu.content.title}`,
          `ID: ${result.cmu.id}`,
          `Activation: ${result.activation.toFixed(2)}`,
          result.cmu.content.narrative,
        ].join('\n'),
      ),
    ].join('\n\n---\n\n');
  }

  private formatBrainMemoryList(
    heading: string,
    results: RetrievalResult[],
    emptyMessage: string,
  ): { content: Array<{ type: 'text'; text: string }> } {
    if (results.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: emptyMessage,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: [
          heading,
          '',
          ...results.map((result) =>
            [
              `[${result.cmu.tier}] ${result.cmu.content.title}`,
              `ID: ${result.cmu.id}`,
              `Type: ${result.cmu.memoryType}`,
              `Project: ${result.cmu.project}`,
              `Activation: ${result.activation.toFixed(2)}`,
              result.cmu.content.narrative,
            ].join('\n'),
          ),
        ].join('\n\n---\n\n'),
      }],
    };
  }

  private filterBrainResults(
    results: RetrievalResult[],
    predicate: (cmu: CMU) => boolean,
    limit: number,
  ): RetrievalResult[] {
    return results.filter((result) => predicate(result.cmu)).slice(0, limit);
  }

  /**
   * Query Chroma vector database via ChromaSync
   * @deprecated Use orchestrator.search() instead
   */
  private async queryChroma(
    query: string,
    limit: number,
    whereFilter?: Record<string, any>
  ): Promise<{ ids: number[]; distances: number[]; metadatas: any[] }> {
    if (!this.chromaSync) {
      return { ids: [], distances: [], metadatas: [] };
    }
    return await this.chromaSync.queryChroma(query, limit, whereFilter);
  }

  /**
   * Helper to normalize query parameters from URL-friendly format
   * Converts comma-separated strings to arrays and flattens date params
   */
  private normalizeParams(args: any): any {
    const normalized: any = { ...args };

    // Map filePath to files (API uses filePath, internal uses files)
    if (normalized.filePath && !normalized.files) {
      normalized.files = normalized.filePath;
      delete normalized.filePath;
    }

    // Parse comma-separated concepts into array
    if (normalized.concepts && typeof normalized.concepts === 'string') {
      normalized.concepts = normalized.concepts.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Parse comma-separated files into array
    if (normalized.files && typeof normalized.files === 'string') {
      normalized.files = normalized.files.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Parse comma-separated obs_type into array
    if (normalized.obs_type && typeof normalized.obs_type === 'string') {
      normalized.obs_type = normalized.obs_type.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Parse comma-separated type (for filterSchema) into array
    if (normalized.type && typeof normalized.type === 'string' && normalized.type.includes(',')) {
      normalized.type = normalized.type.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Flatten dateStart/dateEnd into dateRange object
    if (normalized.dateStart || normalized.dateEnd) {
      normalized.dateRange = {
        start: normalized.dateStart,
        end: normalized.dateEnd
      };
      delete normalized.dateStart;
      delete normalized.dateEnd;
    }

    // Parse isFolder boolean from string
    if (normalized.isFolder === 'true') {
      normalized.isFolder = true;
    } else if (normalized.isFolder === 'false') {
      normalized.isFolder = false;
    }

    return normalized;
  }

  /**
   * Tool handler: search
   */
  async search(args: any): Promise<any> {
    // Normalize URL-friendly params to internal format
    const normalized = this.normalizeParams(args);
    const { query, type, obs_type, concepts, files, format, ...options } = normalized;
    let observations: ObservationSearchResult[] = [];
    let sessions: SessionSummarySearchResult[] = [];
    let prompts: UserPromptSearchResult[] = [];
    let chromaFailed = false;

    // Determine which types to query based on type filter
    const searchObservations = !type || type === 'observations';
    const searchSessions = !type || type === 'sessions';
    const searchPrompts = !type || type === 'prompts';

    // PATH 1: FILTER-ONLY (no query text) - Skip Chroma/FTS5, use direct SQLite filtering
    // This path enables date filtering which Chroma cannot do (requires direct SQLite access)
    if (!query) {
      logger.debug('SEARCH', 'Filter-only query (no query text), using direct SQLite filtering', { enablesDateFilters: true });
      const obsOptions = { ...options, type: obs_type, concepts, files };
      if (searchObservations) {
        observations = this.sessionSearch.searchObservations(undefined, obsOptions);
      }
      if (searchSessions) {
        sessions = this.sessionSearch.searchSessions(undefined, options);
      }
      if (searchPrompts) {
        prompts = this.sessionSearch.searchUserPrompts(undefined, options);
      }
    }
    // PATH 2: CHROMA SEMANTIC SEARCH (query text + Chroma available)
    else if (this.chromaSync) {
      let chromaSucceeded = false;
      logger.debug('SEARCH', 'Using ChromaDB semantic search', { typeFilter: type || 'all' });

      // Build Chroma where filter for doc_type and project
      let whereFilter: Record<string, any> | undefined;
      if (type === 'observations') {
        whereFilter = { doc_type: 'observation' };
      } else if (type === 'sessions') {
        whereFilter = { doc_type: 'session_summary' };
      } else if (type === 'prompts') {
        whereFilter = { doc_type: 'user_prompt' };
      }

      // Include project in the Chroma where clause to scope vector search.
      // Without this, larger projects dominate the top-N results and smaller
      // projects get crowded out before the post-hoc SQLite filter.
      if (options.project) {
        const projectFilter = { project: options.project };
        whereFilter = whereFilter
          ? { $and: [whereFilter, projectFilter] }
          : projectFilter;
      }

      // Step 1: Chroma semantic search with optional type + project filter
      const chromaResults = await this.queryChroma(query, 100, whereFilter);
      chromaSucceeded = true; // Chroma didn't throw error
      logger.debug('SEARCH', 'ChromaDB returned semantic matches', { matchCount: chromaResults.ids.length });

      if (chromaResults.ids.length > 0) {
        // Step 2: Filter by date range
        // Use user-provided dateRange if available, otherwise fall back to 90-day recency window
        const { dateRange } = options;
        let startEpoch: number | undefined;
        let endEpoch: number | undefined;

        if (dateRange) {
          if (dateRange.start) {
            startEpoch = typeof dateRange.start === 'number'
              ? dateRange.start
              : new Date(dateRange.start).getTime();
          }
          if (dateRange.end) {
            endEpoch = typeof dateRange.end === 'number'
              ? dateRange.end
              : new Date(dateRange.end).getTime();
          }
        } else {
          // Default: 90-day recency window
          startEpoch = Date.now() - SEARCH_CONSTANTS.RECENCY_WINDOW_MS;
        }

        const recentMetadata = chromaResults.metadatas.map((meta, idx) => ({
          id: chromaResults.ids[idx],
          meta,
          isRecent: meta && meta.created_at_epoch != null
            && (!startEpoch || meta.created_at_epoch >= startEpoch)
            && (!endEpoch || meta.created_at_epoch <= endEpoch)
        })).filter(item => item.isRecent);

        logger.debug('SEARCH', dateRange ? 'Results within user date range' : 'Results within 90-day window', { count: recentMetadata.length });

        // Step 3: Categorize IDs by document type
        const obsIds: number[] = [];
        const sessionIds: number[] = [];
        const promptIds: number[] = [];

        for (const item of recentMetadata) {
          const docType = item.meta?.doc_type;
          if (docType === 'observation' && searchObservations) {
            obsIds.push(item.id);
          } else if (docType === 'session_summary' && searchSessions) {
            sessionIds.push(item.id);
          } else if (docType === 'user_prompt' && searchPrompts) {
            promptIds.push(item.id);
          }
        }

        logger.debug('SEARCH', 'Categorized results by type', { observations: obsIds.length, sessions: sessionIds.length, prompts: prompts.length });

        // Step 4: Hydrate from SQLite with additional filters
        if (obsIds.length > 0) {
          // Apply obs_type, concepts, files filters if provided
          const obsOptions = { ...options, type: obs_type, concepts, files };
          observations = this.sessionStore.getObservationsByIds(obsIds, obsOptions);
        }
        if (sessionIds.length > 0) {
          sessions = this.sessionStore.getSessionSummariesByIds(sessionIds, { orderBy: 'date_desc', limit: options.limit, project: options.project });
        }
        if (promptIds.length > 0) {
          prompts = this.sessionStore.getUserPromptsByIds(promptIds, { orderBy: 'date_desc', limit: options.limit, project: options.project });
        }

        logger.debug('SEARCH', 'Hydrated results from SQLite', { observations: observations.length, sessions: sessions.length, prompts: prompts.length });
      } else {
        // Chroma returned 0 results - this is the correct answer, don't fall back to FTS5
        logger.debug('SEARCH', 'ChromaDB found no matches (final result, no FTS5 fallback)', {});
      }
    }
    // ChromaDB not initialized - mark as failed to show proper error message
    else if (query) {
      chromaFailed = true;
      logger.debug('SEARCH', 'ChromaDB not initialized - semantic search unavailable', {});
      logger.debug('SEARCH', 'Install UVX/Python to enable vector search', { url: 'https://docs.astral.sh/uv/getting-started/installation/' });
      observations = [];
      sessions = [];
      prompts = [];
    }

    const totalResults = observations.length + sessions.length + prompts.length;

    // JSON format: return raw data for programmatic access (e.g., export scripts)
    if (format === 'json') {
      return {
        observations,
        sessions,
        prompts,
        totalResults,
        query: query || ''
      };
    }

    if (totalResults === 0) {
      if (chromaFailed) {
        return {
          content: [{
            type: 'text' as const,
            text: `Vector search failed - semantic search unavailable.\n\nTo enable semantic search:\n1. Install uv: https://docs.astral.sh/uv/getting-started/installation/\n2. Restart the worker: npm run worker:restart\n\nNote: You can still use filter-only searches (date ranges, types, files) without a query term.`
          }]
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: `No results found matching "${query}"`
        }]
      };
    }

    // Combine all results with timestamps for unified sorting
    interface CombinedResult {
      type: 'observation' | 'session' | 'prompt';
      data: any;
      epoch: number;
      created_at: string;
    }

    const allResults: CombinedResult[] = [
      ...observations.map(obs => ({
        type: 'observation' as const,
        data: obs,
        epoch: obs.created_at_epoch,
        created_at: obs.created_at
      })),
      ...sessions.map(sess => ({
        type: 'session' as const,
        data: sess,
        epoch: sess.created_at_epoch,
        created_at: sess.created_at
      })),
      ...prompts.map(prompt => ({
        type: 'prompt' as const,
        data: prompt,
        epoch: prompt.created_at_epoch,
        created_at: prompt.created_at
      }))
    ];

    // Sort by date
    if (options.orderBy === 'date_desc') {
      allResults.sort((a, b) => b.epoch - a.epoch);
    } else if (options.orderBy === 'date_asc') {
      allResults.sort((a, b) => a.epoch - b.epoch);
    }

    // Apply limit across all types
    const limitedResults = allResults.slice(0, options.limit || 20);

    // Group by date, then by file within each day
    const cwd = process.cwd();
    const resultsByDate = groupByDate(limitedResults, item => item.created_at);

    // Build output with date/file grouping
    const lines: string[] = [];
    lines.push(`Found ${totalResults} result(s) matching "${query}" (${observations.length} obs, ${sessions.length} sessions, ${prompts.length} prompts)`);
    lines.push('');

    for (const [day, dayResults] of resultsByDate) {
      lines.push(`### ${day}`);
      lines.push('');

      // Group by file within this day
      const resultsByFile = new Map<string, CombinedResult[]>();
      for (const result of dayResults) {
        let file = 'General';
        if (result.type === 'observation') {
          file = extractFirstFile(result.data.files_modified, cwd, result.data.files_read);
        }
        if (!resultsByFile.has(file)) {
          resultsByFile.set(file, []);
        }
        resultsByFile.get(file)!.push(result);
      }

      // Render each file section
      for (const [file, fileResults] of resultsByFile) {
        lines.push(`**${file}**`);
        lines.push(this.formatter.formatSearchTableHeader());

        let lastTime = '';
        for (const result of fileResults) {
          if (result.type === 'observation') {
            const formatted = this.formatter.formatObservationSearchRow(result.data as ObservationSearchResult, lastTime);
            lines.push(formatted.row);
            lastTime = formatted.time;
          } else if (result.type === 'session') {
            const formatted = this.formatter.formatSessionSearchRow(result.data as SessionSummarySearchResult, lastTime);
            lines.push(formatted.row);
            lastTime = formatted.time;
          } else {
            const formatted = this.formatter.formatUserPromptSearchRow(result.data as UserPromptSearchResult, lastTime);
            lines.push(formatted.row);
            lastTime = formatted.time;
          }
        }

        lines.push('');
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: lines.join('\n')
      }]
    };
  }

  /**
   * Tool handler: timeline
   */
  async timeline(args: any): Promise<any> {
    const { anchor, query, depth_before = 10, depth_after = 10, project } = args;
    const cwd = process.cwd();

    // Validate: must provide either anchor or query, not both
    if (!anchor && !query) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: Must provide either "anchor" or "query" parameter'
        }],
        isError: true
      };
    }

    if (anchor && query) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: Cannot provide both "anchor" and "query" parameters. Use one or the other.'
        }],
        isError: true
      };
    }

    let anchorId: string | number;
    let anchorEpoch: number;
    let timelineData: any;

    // MODE 1: Query-based timeline
    if (query) {
      // Step 1: Search for observations
      let results: ObservationSearchResult[] = [];

      if (this.chromaSync) {
        try {
          logger.debug('SEARCH', 'Using hybrid semantic search for timeline query', {});
          const chromaResults = await this.queryChroma(query, 100);
          logger.debug('SEARCH', 'Chroma returned semantic matches for timeline', { matchCount: chromaResults?.ids?.length ?? 0 });

          if (chromaResults?.ids && chromaResults.ids.length > 0) {
            const ninetyDaysAgo = Date.now() - SEARCH_CONSTANTS.RECENCY_WINDOW_MS;
            const recentIds = chromaResults.ids.filter((_id, idx) => {
              const meta = chromaResults.metadatas[idx];
              return meta && meta.created_at_epoch > ninetyDaysAgo;
            });

            if (recentIds.length > 0) {
              results = this.sessionStore.getObservationsByIds(recentIds, { orderBy: 'date_desc', limit: 1 });
            }
          }
        } catch (chromaError) {
          logger.error('SEARCH', 'Chroma search failed for timeline, continuing without semantic results', {}, chromaError as Error);
        }
      }

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No observations found matching "${query}". Try a different search query.`
          }]
        };
      }

      // Use top result as anchor
      const topResult = results[0];
      anchorId = topResult.id;
      anchorEpoch = topResult.created_at_epoch;
      logger.debug('SEARCH', 'Query mode: Using observation as timeline anchor', { observationId: topResult.id });
      timelineData = this.sessionStore.getTimelineAroundObservation(topResult.id, topResult.created_at_epoch, depth_before, depth_after, project);
    }
    // MODE 2: Anchor-based timeline
    else if (typeof anchor === 'number') {
      // Observation ID
      const obs = this.sessionStore.getObservationById(anchor);
      if (!obs) {
        return {
          content: [{
            type: 'text' as const,
            text: `Observation #${anchor} not found`
          }],
          isError: true
        };
      }
      anchorId = anchor;
      anchorEpoch = obs.created_at_epoch;
      timelineData = this.sessionStore.getTimelineAroundObservation(anchor, anchorEpoch, depth_before, depth_after, project);
    } else if (typeof anchor === 'string') {
      // Session ID or ISO timestamp
      if (anchor.startsWith('S') || anchor.startsWith('#S')) {
        const sessionId = anchor.replace(/^#?S/, '');
        const sessionNum = parseInt(sessionId, 10);
        const sessions = this.sessionStore.getSessionSummariesByIds([sessionNum]);
        if (sessions.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `Session #${sessionNum} not found`
            }],
            isError: true
          };
        }
        anchorEpoch = sessions[0].created_at_epoch;
        anchorId = `S${sessionNum}`;
        timelineData = this.sessionStore.getTimelineAroundTimestamp(anchorEpoch, depth_before, depth_after, project);
      } else {
        // ISO timestamp
        const date = new Date(anchor);
        if (isNaN(date.getTime())) {
          return {
            content: [{
              type: 'text' as const,
              text: `Invalid timestamp: ${anchor}`
            }],
            isError: true
          };
        }
        anchorEpoch = date.getTime();
        anchorId = anchor;
        timelineData = this.sessionStore.getTimelineAroundTimestamp(anchorEpoch, depth_before, depth_after, project);
      }
    } else {
      return {
        content: [{
          type: 'text' as const,
          text: 'Invalid anchor: must be observation ID (number), session ID (e.g., "S123"), or ISO timestamp'
        }],
        isError: true
      };
    }

    // Combine, sort, and filter timeline items
    const items: TimelineItem[] = [
      ...(timelineData.observations || []).map((obs: any) => ({ type: 'observation' as const, data: obs, epoch: obs.created_at_epoch })),
      ...(timelineData.sessions || []).map((sess: any) => ({ type: 'session' as const, data: sess, epoch: sess.created_at_epoch })),
      ...(timelineData.prompts || []).map((prompt: any) => ({ type: 'prompt' as const, data: prompt, epoch: prompt.created_at_epoch }))
    ];
    items.sort((a, b) => a.epoch - b.epoch);
    const filteredItems = this.timelineService.filterByDepth(items, anchorId, anchorEpoch, depth_before, depth_after);

    if (!filteredItems || filteredItems.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: query
            ? `Found observation matching "${query}", but no timeline context available (${depth_before} records before, ${depth_after} records after).`
            : `No context found around anchor (${depth_before} records before, ${depth_after} records after)`
        }]
      };
    }

    // Format results
    const lines: string[] = [];

    // Header
    if (query) {
      const anchorObs = filteredItems.find(item => item.type === 'observation' && item.data.id === anchorId);
      const anchorTitle = anchorObs && anchorObs.type === 'observation' ? ((anchorObs.data as ObservationSearchResult).title || 'Untitled') : 'Unknown';
      lines.push(`# Timeline for query: "${query}"`);
      lines.push(`**Anchor:** Observation #${anchorId} - ${anchorTitle}`);
    } else {
      lines.push(`# Timeline around anchor: ${anchorId}`);
    }

    lines.push(`**Window:** ${depth_before} records before -> ${depth_after} records after | **Items:** ${filteredItems?.length ?? 0}`);
    lines.push('');


    // Group by day
    const dayMap = new Map<string, TimelineItem[]>();
    for (const item of filteredItems) {
      const day = formatDate(item.epoch);
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day)!.push(item);
    }

    // Sort days chronologically
    const sortedDays = Array.from(dayMap.entries()).sort((a, b) => {
      const aDate = new Date(a[0]).getTime();
      const bDate = new Date(b[0]).getTime();
      return aDate - bDate;
    });

    // Render each day
    for (const [day, dayItems] of sortedDays) {
      lines.push(`### ${day}`);
      lines.push('');

      let currentFile: string | null = null;
      let lastTime = '';
      let tableOpen = false;

      for (const item of dayItems) {
        const isAnchor = (
          (typeof anchorId === 'number' && item.type === 'observation' && item.data.id === anchorId) ||
          (typeof anchorId === 'string' && anchorId.startsWith('S') && item.type === 'session' && `S${item.data.id}` === anchorId)
        );

        if (item.type === 'session') {
          if (tableOpen) {
            lines.push('');
            tableOpen = false;
            currentFile = null;
            lastTime = '';
          }

          const sess = item.data as SessionSummarySearchResult;
          const title = sess.request || 'Session summary';
          const marker = isAnchor ? ' <- **ANCHOR**' : '';

          lines.push(`**\uD83C\uDFAF #S${sess.id}** ${title} (${formatDateTime(item.epoch)})${marker}`);
          lines.push('');
        } else if (item.type === 'prompt') {
          if (tableOpen) {
            lines.push('');
            tableOpen = false;
            currentFile = null;
            lastTime = '';
          }

          const prompt = item.data as UserPromptSearchResult;
          const truncated = prompt.prompt_text.length > 100 ? prompt.prompt_text.substring(0, 100) + '...' : prompt.prompt_text;

          lines.push(`**\uD83D\uDCAC User Prompt #${prompt.prompt_number}** (${formatDateTime(item.epoch)})`);
          lines.push(`> ${truncated}`);
          lines.push('');
        } else if (item.type === 'observation') {
          const obs = item.data as ObservationSearchResult;
          const file = extractFirstFile(obs.files_modified, cwd, obs.files_read);

          if (file !== currentFile) {
            if (tableOpen) {
              lines.push('');
            }

            lines.push(`**${file}**`);
            lines.push(`| ID | Time | T | Title | Tokens |`);
            lines.push(`|----|------|---|-------|--------|`);

            currentFile = file;
            tableOpen = true;
            lastTime = '';
          }

          const icon = ModeManager.getInstance().getTypeIcon(obs.type);

          const time = formatTime(item.epoch);
          const title = obs.title || 'Untitled';
          const tokens = estimateTokens(obs.narrative);

          const showTime = time !== lastTime;
          const timeDisplay = showTime ? time : '"';
          lastTime = time;

          const anchorMarker = isAnchor ? ' <- **ANCHOR**' : '';
          lines.push(`| #${obs.id} | ${timeDisplay} | ${icon} | ${title}${anchorMarker} | ~${tokens} |`);
        }
      }

      if (tableOpen) {
        lines.push('');
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: lines.join('\n')
      }]
    };
  }

  /**
   * Tool handler: decisions
   */
  async decisions(args: any): Promise<any> {
    const brainResults = await this.brainSearch(args.query || 'decision architecture design rationale', {
      project: args.project,
      limit: args.limit || 20,
      tiers: [MemoryTier.Semantic, MemoryTier.Episodic],
    });
    return this.formatBrainMemoryList(
      'Decision memories',
      brainResults,
      'No decision memories found',
    );
  }

  /**
   * Tool handler: changes
   */
  async changes(args: any): Promise<any> {
    const brainResults = await this.brainSearch(args.query || 'change modified refactor implementation', {
      project: args.project,
      limit: args.limit || 20,
      tiers: [MemoryTier.Episodic, MemoryTier.Procedural],
    });
    return this.formatBrainMemoryList(
      'Change memories',
      brainResults,
      'No change memories found',
    );
  }


  /**
   * Tool handler: how_it_works
   */
  async howItWorks(args: any): Promise<any> {
    const brainResults = await this.brainSearch(args.query || 'how it works architecture flow implementation', {
      project: args.project,
      limit: args.limit || 20,
      tiers: [MemoryTier.Semantic, MemoryTier.Procedural],
    });
    return this.formatBrainMemoryList(
      'How-it-works memories',
      brainResults,
      'No "how it works" memories found',
    );
  }


  /**
   * Tool handler: search_observations
   */
  async searchObservations(args: any): Promise<any> {
    const normalized = this.normalizeParams(args);
    const query = typeof normalized.query === 'string' ? normalized.query : '';
    const brainResults = await this.brainSearch(query, {
      project: normalized.project,
      limit: normalized.limit || 20,
    });

    return this.formatBrainMemoryList(
      `Brain memories matching "${query}"`,
      brainResults,
      `No brain memories found matching "${query}"`,
    );
  }


  /**
   * Tool handler: search_sessions
   */
  async searchSessions(args: any): Promise<any> {
    const normalized = this.normalizeParams(args);
    const { query, ...options } = normalized;
    let results: SessionSummarySearchResult[] = [];

    // Vector-first search via ChromaDB
    if (this.chromaSync) {
      logger.debug('SEARCH', 'Using hybrid semantic search for sessions', {});

      // Step 1: Chroma semantic search (top 100)
      const chromaResults = await this.queryChroma(query, 100, { doc_type: 'session_summary' });
      logger.debug('SEARCH', 'Chroma returned semantic matches for sessions', { matchCount: chromaResults.ids.length });

      if (chromaResults.ids.length > 0) {
        // Step 2: Filter by recency (90 days)
        const ninetyDaysAgo = Date.now() - SEARCH_CONSTANTS.RECENCY_WINDOW_MS;
        const recentIds = chromaResults.ids.filter((_id, idx) => {
          const meta = chromaResults.metadatas[idx];
          return meta && meta.created_at_epoch > ninetyDaysAgo;
        });

        logger.debug('SEARCH', 'Results within 90-day window', { count: recentIds.length });

        // Step 3: Hydrate from SQLite in temporal order
        if (recentIds.length > 0) {
          const limit = options.limit || 20;
          results = this.sessionStore.getSessionSummariesByIds(recentIds, { orderBy: 'date_desc', limit });
          logger.debug('SEARCH', 'Hydrated sessions from SQLite', { count: results.length });
        }
      }
    }

    if (results.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No sessions found matching "${query}"`
        }]
      };
    }

    // Format as table
    const header = `Found ${results.length} session(s) matching "${query}"\n\n${this.formatter.formatTableHeader()}`;
    const formattedResults = results.map((session, i) => this.formatter.formatSessionIndex(session, i));

    return {
      content: [{
        type: 'text' as const,
        text: header + '\n' + formattedResults.join('\n')
      }]
    };
  }


  /**
   * Tool handler: search_user_prompts
   */
  async searchUserPrompts(args: any): Promise<any> {
    const normalized = this.normalizeParams(args);
    const { query, ...options } = normalized;
    let results: UserPromptSearchResult[] = [];

    // Vector-first search via ChromaDB
    if (this.chromaSync) {
      logger.debug('SEARCH', 'Using hybrid semantic search for user prompts', {});

      // Step 1: Chroma semantic search (top 100)
      const chromaResults = await this.queryChroma(query, 100, { doc_type: 'user_prompt' });
      logger.debug('SEARCH', 'Chroma returned semantic matches for prompts', { matchCount: chromaResults.ids.length });

      if (chromaResults.ids.length > 0) {
        // Step 2: Filter by recency (90 days)
        const ninetyDaysAgo = Date.now() - SEARCH_CONSTANTS.RECENCY_WINDOW_MS;
        const recentIds = chromaResults.ids.filter((_id, idx) => {
          const meta = chromaResults.metadatas[idx];
          return meta && meta.created_at_epoch > ninetyDaysAgo;
        });

        logger.debug('SEARCH', 'Results within 90-day window', { count: recentIds.length });

        // Step 3: Hydrate from SQLite in temporal order
        if (recentIds.length > 0) {
          const limit = options.limit || 20;
          results = this.sessionStore.getUserPromptsByIds(recentIds, { orderBy: 'date_desc', limit });
          logger.debug('SEARCH', 'Hydrated user prompts from SQLite', { count: results.length });
        }
      }
    }

    if (results.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: query ? `No user prompts found matching "${query}"` : 'No user prompts found'
        }]
      };
    }

    // Format as table
    const header = `Found ${results.length} user prompt(s) matching "${query}"\n\n${this.formatter.formatTableHeader()}`;
    const formattedResults = results.map((prompt, i) => this.formatter.formatUserPromptIndex(prompt, i));

    return {
      content: [{
        type: 'text' as const,
        text: header + '\n' + formattedResults.join('\n')
      }]
    };
  }


  /**
   * Tool handler: find_by_concept
   */
  async findByConcept(args: any): Promise<any> {
    const normalized = this.normalizeParams(args);
    const { concepts: concept, ...filters } = normalized;
    const conceptValues = Array.isArray(concept) ? concept : [concept];
    const seedQuery = conceptValues.filter(Boolean).join(' ');
    const brainResults = await this.brainSearch(seedQuery, {
      project: filters.project,
      limit: (filters.limit || 20) * 2,
    });
    const filtered = this.filterBrainResults(
      brainResults,
      (cmu) => conceptValues.every((item) => cmu.content.concepts.includes(item)),
      filters.limit || 20,
    );

    return this.formatBrainMemoryList(
      `Brain memories with concept "${seedQuery}"`,
      filtered,
      `No brain memories found with concept "${seedQuery}"`,
    );
  }


  /**
   * Tool handler: find_by_file
   */
  async findByFile(args: any): Promise<any> {
    const normalized = this.normalizeParams(args);
    const { files: rawFilePath, ...filters } = normalized;
    const filePath = Array.isArray(rawFilePath) ? rawFilePath[0] : rawFilePath;
    const brainResults = await this.brainSearch(filePath, {
      project: filters.project,
      limit: (filters.limit || 20) * 2,
    });
    const filtered = this.filterBrainResults(
      brainResults,
      (cmu) =>
        [...cmu.content.filesRead, ...cmu.content.filesModified].some((item) => item.includes(filePath)),
      filters.limit || 20,
    );

    return this.formatBrainMemoryList(
      `Brain memories for file "${filePath}"`,
      filtered,
      `No brain memories found for file "${filePath}"`,
    );
  }


  /**
   * Tool handler: find_by_type
   */
  async findByType(args: any): Promise<any> {
    const normalized = this.normalizeParams(args);
    const { type, ...filters } = normalized;
    const typeStr = Array.isArray(type) ? type.join(', ') : type;
    const typeValues = Array.isArray(type) ? type : [type];
    const brainResults = await this.brainSearch(typeStr, {
      project: filters.project,
      limit: (filters.limit || 20) * 2,
    });
    const filtered = this.filterBrainResults(
      brainResults,
      (cmu) => typeValues.includes(cmu.memoryType),
      filters.limit || 20,
    );

    return this.formatBrainMemoryList(
      `Brain memories with type "${typeStr}"`,
      filtered,
      `No brain memories found with type "${typeStr}"`,
    );
  }


  /**
   * Tool handler: get_recent_context
   */
  async getRecentContext(args: any): Promise<any> {
    const project = (args.project && getProjectAliases(args.project)[0]) || getProjectContext(process.cwd()).canonical;
    const limit = args.limit || 6;
    const brainResults = await this.brainSearch('', {
      project,
      limit,
      tiers: [MemoryTier.Semantic, MemoryTier.Procedural, MemoryTier.Episodic],
    });
    const lines: string[] = ['# Recent Brain Context', ''];

    if (brainResults.length === 0) {
      lines.push(`No brain memories found for project "${project}".`);
    } else {
      lines.push(`Showing ${brainResults.length} most relevant memories for **${project}**.`);
      lines.push('');
      for (const result of brainResults) {
        lines.push(`- [${result.cmu.tier}] ${result.cmu.content.title}: ${result.cmu.content.narrative.slice(0, 180)}`);
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: lines.join('\n')
      }]
    };
  }

  /**
   * Tool handler: get_context_timeline
   */
  async getContextTimeline(args: any): Promise<any> {
    const { anchor, depth_before = 10, depth_after = 10, project } = args;
    const cwd = process.cwd();
    let anchorEpoch: number;
    let anchorId: string | number = anchor;

    // Resolve anchor and get timeline data
    let timelineData;
    if (typeof anchor === 'number') {
      // Observation ID - use ID-based boundary detection
      const obs = this.sessionStore.getObservationById(anchor);
      if (!obs) {
        return {
          content: [{
            type: 'text' as const,
            text: `Observation #${anchor} not found`
          }],
          isError: true
        };
      }
      anchorEpoch = obs.created_at_epoch;
      timelineData = this.sessionStore.getTimelineAroundObservation(anchor, anchorEpoch, depth_before, depth_after, project);
    } else if (typeof anchor === 'string') {
      // Session ID or ISO timestamp
      if (anchor.startsWith('S') || anchor.startsWith('#S')) {
        const sessionId = anchor.replace(/^#?S/, '');
        const sessionNum = parseInt(sessionId, 10);
        const sessions = this.sessionStore.getSessionSummariesByIds([sessionNum]);
        if (sessions.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `Session #${sessionNum} not found`
            }],
            isError: true
          };
        }
        anchorEpoch = sessions[0].created_at_epoch;
        anchorId = `S${sessionNum}`;
        timelineData = this.sessionStore.getTimelineAroundTimestamp(anchorEpoch, depth_before, depth_after, project);
      } else {
        // ISO timestamp
        const date = new Date(anchor);
        if (isNaN(date.getTime())) {
          return {
            content: [{
              type: 'text' as const,
              text: `Invalid timestamp: ${anchor}`
            }],
            isError: true
          };
        }
        anchorEpoch = date.getTime(); // Keep as milliseconds
        timelineData = this.sessionStore.getTimelineAroundTimestamp(anchorEpoch, depth_before, depth_after, project);
      }
    } else {
      return {
        content: [{
          type: 'text' as const,
          text: 'Invalid anchor: must be observation ID (number), session ID (e.g., "S123"), or ISO timestamp'
        }],
        isError: true
      };
    }

    // Combine, sort, and filter timeline items
    const items: TimelineItem[] = [
      ...timelineData.observations.map(obs => ({ type: 'observation' as const, data: obs, epoch: obs.created_at_epoch })),
      ...timelineData.sessions.map(sess => ({ type: 'session' as const, data: sess, epoch: sess.created_at_epoch })),
      ...timelineData.prompts.map(prompt => ({ type: 'prompt' as const, data: prompt, epoch: prompt.created_at_epoch }))
    ];
    items.sort((a, b) => a.epoch - b.epoch);
    const filteredItems = this.timelineService.filterByDepth(items, anchorId, anchorEpoch, depth_before, depth_after);

    if (!filteredItems || filteredItems.length === 0) {
      const anchorDate = new Date(anchorEpoch).toLocaleString();
      return {
        content: [{
          type: 'text' as const,
          text: `No context found around ${anchorDate} (${depth_before} records before, ${depth_after} records after)`
        }]
      };
    }

    // Format results matching context-hook.ts exactly
    const lines: string[] = [];

    // Header
    lines.push(`# Timeline around anchor: ${anchorId}`);
    lines.push(`**Window:** ${depth_before} records before -> ${depth_after} records after | **Items:** ${filteredItems?.length ?? 0}`);
    lines.push('');


    // Group by day
    const dayMap = new Map<string, TimelineItem[]>();
    for (const item of filteredItems) {
      const day = formatDate(item.epoch);
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day)!.push(item);
    }

    // Sort days chronologically
    const sortedDays = Array.from(dayMap.entries()).sort((a, b) => {
      const aDate = new Date(a[0]).getTime();
      const bDate = new Date(b[0]).getTime();
      return aDate - bDate;
    });

    // Render each day
    for (const [day, dayItems] of sortedDays) {
      lines.push(`### ${day}`);
      lines.push('');

      let currentFile: string | null = null;
      let lastTime = '';
      let tableOpen = false;

      for (const item of dayItems) {
        const isAnchor = (
          (typeof anchorId === 'number' && item.type === 'observation' && item.data.id === anchorId) ||
          (typeof anchorId === 'string' && anchorId.startsWith('S') && item.type === 'session' && `S${item.data.id}` === anchorId)
        );

        if (item.type === 'session') {
          // Close any open table
          if (tableOpen) {
            lines.push('');
            tableOpen = false;
            currentFile = null;
            lastTime = '';
          }

          // Render session
          const sess = item.data as SessionSummarySearchResult;
          const title = sess.request || 'Session summary';
          const marker = isAnchor ? ' <- **ANCHOR**' : '';

          lines.push(`**\uD83C\uDFAF #S${sess.id}** ${title} (${formatDateTime(item.epoch)})${marker}`);
          lines.push('');
        } else if (item.type === 'prompt') {
          // Close any open table
          if (tableOpen) {
            lines.push('');
            tableOpen = false;
            currentFile = null;
            lastTime = '';
          }

          // Render prompt
          const prompt = item.data as UserPromptSearchResult;
          const truncated = prompt.prompt_text.length > 100 ? prompt.prompt_text.substring(0, 100) + '...' : prompt.prompt_text;

          lines.push(`**\uD83D\uDCAC User Prompt #${prompt.prompt_number}** (${formatDateTime(item.epoch)})`);
          lines.push(`> ${truncated}`);
          lines.push('');
        } else if (item.type === 'observation') {
          // Render observation in table
          const obs = item.data as ObservationSearchResult;
          const file = extractFirstFile(obs.files_modified, cwd, obs.files_read);

          // Check if we need a new file section
          if (file !== currentFile) {
            // Close previous table
            if (tableOpen) {
              lines.push('');
            }

            // File header
            lines.push(`**${file}**`);
            lines.push(`| ID | Time | T | Title | Tokens |`);
            lines.push(`|----|------|---|-------|--------|`);

            currentFile = file;
            tableOpen = true;
            lastTime = '';
          }

          // Map observation type to emoji
          const icon = ModeManager.getInstance().getTypeIcon(obs.type);

          const time = formatTime(item.epoch);
          const title = obs.title || 'Untitled';
          const tokens = estimateTokens(obs.narrative);

          const showTime = time !== lastTime;
          const timeDisplay = showTime ? time : '"';
          lastTime = time;

          const anchorMarker = isAnchor ? ' <- **ANCHOR**' : '';
          lines.push(`| #${obs.id} | ${timeDisplay} | ${icon} | ${title}${anchorMarker} | ~${tokens} |`);
        }
      }

      // Close final table if open
      if (tableOpen) {
        lines.push('');
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: lines.join('\n')
      }]
    };
  }

  /**
   * Tool handler: get_timeline_by_query
   */
  async getTimelineByQuery(args: any): Promise<any> {
    const { query, mode = 'auto', depth_before = 10, depth_after = 10, limit = 5, project } = args;
    const cwd = process.cwd();

    // Step 1: Search for observations
    let results: ObservationSearchResult[] = [];

    // Use hybrid search if available
    if (this.chromaSync) {
      logger.debug('SEARCH', 'Using hybrid semantic search for timeline query', {});
      const chromaResults = await this.queryChroma(query, 100);
      logger.debug('SEARCH', 'Chroma returned semantic matches for timeline', { matchCount: chromaResults.ids.length });

      if (chromaResults.ids.length > 0) {
        // Filter by recency (90 days)
        const ninetyDaysAgo = Date.now() - SEARCH_CONSTANTS.RECENCY_WINDOW_MS;
        const recentIds = chromaResults.ids.filter((_id, idx) => {
          const meta = chromaResults.metadatas[idx];
          return meta && meta.created_at_epoch > ninetyDaysAgo;
        });

        logger.debug('SEARCH', 'Results within 90-day window', { count: recentIds.length });

        if (recentIds.length > 0) {
          results = this.sessionStore.getObservationsByIds(recentIds, { orderBy: 'date_desc', limit: mode === 'auto' ? 1 : limit });
          logger.debug('SEARCH', 'Hydrated observations from SQLite', { count: results.length });
        }
      }
    }

    if (results.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No observations found matching "${query}". Try a different search query.`
        }]
      };
    }

    // Step 2: Handle based on mode
    if (mode === 'interactive') {
      // Return formatted index of top results for LLM to choose from
      const lines: string[] = [];
      lines.push(`# Timeline Anchor Search Results`);
      lines.push('');
      lines.push(`Found ${results.length} observation(s) matching "${query}"`);
      lines.push('');
      lines.push(`To get timeline context around any of these observations, use the \`get_context_timeline\` tool with the observation ID as the anchor.`);
      lines.push('');
      lines.push(`**Top ${results.length} matches:**`);
      lines.push('');

      for (let i = 0; i < results.length; i++) {
        const obs = results[i];
        const title = obs.title || `Observation #${obs.id}`;
        const date = new Date(obs.created_at_epoch).toLocaleString();
        const type = obs.type ? `[${obs.type}]` : '';

        lines.push(`${i + 1}. **${type} ${title}**`);
        lines.push(`   - ID: ${obs.id}`);
        lines.push(`   - Date: ${date}`);
        if (obs.subtitle) {
          lines.push(`   - ${obs.subtitle}`);
        }
        lines.push('');
      }

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n')
        }]
      };
    } else {
      // Auto mode: Use top result as timeline anchor
      const topResult = results[0];
      logger.debug('SEARCH', 'Auto mode: Using observation as timeline anchor', { observationId: topResult.id });

      // Get timeline around this observation
      const timelineData = this.sessionStore.getTimelineAroundObservation(
        topResult.id,
        topResult.created_at_epoch,
        depth_before,
        depth_after,
        project
      );

      // Combine, sort, and filter timeline items
      const items: TimelineItem[] = [
        ...(timelineData.observations || []).map(obs => ({ type: 'observation' as const, data: obs, epoch: obs.created_at_epoch })),
        ...(timelineData.sessions || []).map(sess => ({ type: 'session' as const, data: sess, epoch: sess.created_at_epoch })),
        ...(timelineData.prompts || []).map(prompt => ({ type: 'prompt' as const, data: prompt, epoch: prompt.created_at_epoch }))
      ];
      items.sort((a, b) => a.epoch - b.epoch);
      const filteredItems = this.timelineService.filterByDepth(items, topResult.id, 0, depth_before, depth_after);

      if (!filteredItems || filteredItems.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `Found observation #${topResult.id} matching "${query}", but no timeline context available (${depth_before} records before, ${depth_after} records after).`
          }]
        };
      }

      // Format timeline (reused from get_context_timeline)
      const lines: string[] = [];

      // Header
      lines.push(`# Timeline for query: "${query}"`);
      lines.push(`**Anchor:** Observation #${topResult.id} - ${topResult.title || 'Untitled'}`);
      lines.push(`**Window:** ${depth_before} records before -> ${depth_after} records after | **Items:** ${filteredItems?.length ?? 0}`);
      lines.push('');


      // Group by day
      const dayMap = new Map<string, TimelineItem[]>();
      for (const item of filteredItems) {
        const day = formatDate(item.epoch);
        if (!dayMap.has(day)) {
          dayMap.set(day, []);
        }
        dayMap.get(day)!.push(item);
      }

      // Sort days chronologically
      const sortedDays = Array.from(dayMap.entries()).sort((a, b) => {
        const aDate = new Date(a[0]).getTime();
        const bDate = new Date(b[0]).getTime();
        return aDate - bDate;
      });

      // Render each day
      for (const [day, dayItems] of sortedDays) {
        lines.push(`### ${day}`);
        lines.push('');

        let currentFile: string | null = null;
        let lastTime = '';
        let tableOpen = false;

        for (const item of dayItems) {
          const isAnchor = (item.type === 'observation' && item.data.id === topResult.id);

          if (item.type === 'session') {
            // Close any open table
            if (tableOpen) {
              lines.push('');
              tableOpen = false;
              currentFile = null;
              lastTime = '';
            }

            // Render session
            const sess = item.data as SessionSummarySearchResult;
            const title = sess.request || 'Session summary';

            lines.push(`**\uD83C\uDFAF #S${sess.id}** ${title} (${formatDateTime(item.epoch)})`);
            lines.push('');
          } else if (item.type === 'prompt') {
            // Close any open table
            if (tableOpen) {
              lines.push('');
              tableOpen = false;
              currentFile = null;
              lastTime = '';
            }

            // Render prompt
            const prompt = item.data as UserPromptSearchResult;
            const truncated = prompt.prompt_text.length > 100 ? prompt.prompt_text.substring(0, 100) + '...' : prompt.prompt_text;

            lines.push(`**\uD83D\uDCAC User Prompt #${prompt.prompt_number}** (${formatDateTime(item.epoch)})`);
            lines.push(`> ${truncated}`);
            lines.push('');
          } else if (item.type === 'observation') {
            // Render observation in table
            const obs = item.data as ObservationSearchResult;
            const file = extractFirstFile(obs.files_modified, cwd, obs.files_read);

            // Check if we need a new file section
            if (file !== currentFile) {
              // Close previous table
              if (tableOpen) {
                lines.push('');
              }

              // File header
              lines.push(`**${file}**`);
              lines.push(`| ID | Time | T | Title | Tokens |`);
              lines.push(`|----|------|---|-------|--------|`);

              currentFile = file;
              tableOpen = true;
              lastTime = '';
            }

            // Map observation type to emoji
            const icon = ModeManager.getInstance().getTypeIcon(obs.type);

            const time = formatTime(item.epoch);
            const title = obs.title || 'Untitled';
            const tokens = estimateTokens(obs.narrative);

            const showTime = time !== lastTime;
            const timeDisplay = showTime ? time : '"';
            lastTime = time;

            const anchorMarker = isAnchor ? ' <- **ANCHOR**' : '';
            lines.push(`| #${obs.id} | ${timeDisplay} | ${icon} | ${title}${anchorMarker} | ~${tokens} |`);
          }
        }

        // Close final table if open
        if (tableOpen) {
          lines.push('');
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n')
        }]
      };
    }
  }
}
