# ai-mem

Brain-inspired persistent memory system for AI coding agents.

Forked from [claude-mem](https://github.com/thedotmack/claude-mem) with architecture inspired by human memory research (ACT-R theory, spreading activation, memory consolidation).

## Features

- **ACT-R Activation** - Memory salience based on recency, frequency, and context relevance
- **Spreading Activation** - Associative memory retrieval through knowledge graph traversal  
- **Memory Consolidation** - Automatic deduplication and semantic pruning
- **Shared SQLite Brain Memory** - OpenCode, Claude Code, and Codex can use the same persistent memory store
- **Near-Real-Time Visibility** - Long-lived runtimes refresh from SQLite so memories written by one tool become visible to the others
- **Universal Plugin** - Works with OpenCode, Claude Code, and Codex

## Installation

### OpenCode

Run from this repository:

```bash
make setup-opencode
make doctor-opencode
```

Or add to `~/.config/opencode/opencode.json` manually:

```json
{
  "plugin": [
    "file:///absolute/path/to/ai-mem/src/plugin/opencode.ts"
  ]
}
```

`make setup-opencode` writes the correct absolute `file://` plugin entry automatically.

If you are installing OpenCode from the parent `opencode-rs` repository, use:

```bash
make opencode-install
```

That flow clones/prepares `ai-mem`, writes the plugin entry into `~/.config/opencode/opencode.json`, and installs the OpenCode binary.

### Claude Code

```bash
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

### Codex

Codex can feed the same memory store through transcript watching and the shared worker/session routes in this repository.

## Viewer

To inspect memory in the browser, start the worker service from this repository:

```bash
bun plugin/scripts/worker-service.cjs start
```

Then open:

```text
http://localhost:37777/
```

Useful commands:

```bash
bun plugin/scripts/worker-service.cjs status
bun plugin/scripts/worker-service.cjs restart
```

## Architecture

```
src/
├── types/brain/           # Typed enums: MemoryTier, MemoryType, EmotionalTag
├── config/               # BrainSettings with validation
├── engine/brain/
│   ├── activation.ts      # ACT-R: B = Σ(t_i^-d)
│   ├── graph.ts          # Spreading activation
│   ├── engine.ts         # BrainEngine orchestrator
│   ├── storage.ts        # Storage interface
│   ├── sqlite-storage.ts # SQLite implementation
│   └── pruning/         # dedupe, cull, consolidation
└── plugin/
    └── opencode.ts       # OpenCode hook integration
```

The active runtime model is:

- shared SQLite-backed brain memory
- OpenCode plugin integration
- Claude/Codex worker and transcript ingestion
- browser viewer backed by the worker service

## Configuration

Settings in `~/.claude-mem/settings.json` or via environment variables:

- `AIMEM_ACTIVATION_DECAY` - ACT-R decay parameter (default: 0.5)
- `AIMEM_CONSOLIDATION_INTERVAL` - Minutes between consolidation runs (default: 60)
- `AIMEM_VECTOR_URL` - Qdrant server URL

## License

AGPL-3.0
