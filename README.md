# ai-mem

Brain-inspired persistent memory system for AI coding agents.

Forked from [claude-mem](https://github.com/thedotmack/claude-mem) with architecture inspired by human memory research (ACT-R theory, spreading activation, memory consolidation).

## Features

- **ACT-R Activation** - Memory salience based on recency, frequency, and context relevance
- **Spreading Activation** - Associative memory retrieval through knowledge graph traversal  
- **Memory Consolidation** - Automatic deduplication and semantic pruning
- **Multi-Tier Storage** - Fast SQLite for recent memories, vector search (Qdrant) for semantic retrieval
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
  "plugin": ["ai-mem"]
}
```

### Claude Code

```bash
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
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
│   ├── vector-search.ts  # Qdrant integration
│   └── pruning/         # dedupe, cull, consolidation
└── plugin/
    └── opencode.ts       # OpenCode hook integration
```

## Configuration

Settings in `~/.claude-mem/settings.json` or via environment variables:

- `AIMEM_ACTIVATION_DECAY` - ACT-R decay parameter (default: 0.5)
- `AIMEM_CONSOLIDATION_INTERVAL` - Minutes between consolidation runs (default: 60)
- `AIMEM_VECTOR_URL` - Qdrant server URL

## License

AGPL-3.0
