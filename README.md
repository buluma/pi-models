# Pi Models Extension

**Browse and switch AI models in Pi with an intuitive cascading menu.**

This extension adds a `/models` command to [Pi](https://github.com/badlogic/pi-mono) that opens an interactive model browser. Instead of typing model IDs, you can visually navigate through providers and model families to find and switch models instantly.

---

## What This Is

Pi Models replaces manual model switching with a point-and-select interface:

- **Visual browsing** - See all available models organized by provider or family
- **Two browsing modes** - Choose your navigation style: by provider (Anthropic → Claude) or by model family (Claude → pick provider)
- **Smart grouping** - Automatically groups models into families (GPT-4, Claude, Llama, etc.)
- **Multi-provider awareness** - When the same model is available from multiple providers (e.g., Claude via Anthropic, AWS, or Vertex), you choose which one to use
- **Free model discovery** - All free models from any provider grouped together at the top
- **No truncation** - Full model names are displayed with dynamic column sizing

---

## How to Use It

### 1. Open the Browser

Type `/models` in Pi's input box and press Enter:

```
User: /models
Pi: [Model browser opens]
```

### 2. Choose Browse Mode

First, pick how you want to browse:

```
📦 Browse Models
→ 📦 By Provider          ← Browse provider → model
  🏷️ By Model Family     ← Browse family → provider → model
```

| Mode | Best For | Flow |
|------|----------|------|
| **By Provider** | When you know which company (Anthropic, OpenAI) | Provider → Model |
| **By Model Family** | When you know the model type (Claude, GPT-4) | Family → Provider (if multi) → Model |

**Navigate:** ↑/↓ or k/j to move, Enter to select, Esc to cancel

### 3. Browse and Select

#### By Provider View

```
📦 Models                    📦 anthropic
→ 🆓 Free Models (3)         → ● claude-sonnet-4-20250514
  anthropic (8)                claude-haiku-3-20240307
  google (4)                   claude-opus-4-20250514
  openai (6)
  ollama (12)
```

1. Select a provider (or 🆓 Free Models)
2. See all models for that provider
3. Select a model to switch to it

#### By Model Family View

```
🏷️ Model Families            🏷️ Claude Sonnet
→ 🆓 Free Models (3)         → anthropic
  Claude Haiku (2)             aws
  Claude Opus (2)              vertex
  Claude Sonnet (3)
  GPT-4o (4)
  Llama 3.3 (5)
```

1. Select a model family (or 🆓 Free Models)
2. **If multiple providers:** Choose which provider's version
3. **If single provider:** Latest version is selected automatically
4. Model switches instantly

### 4. Model Switches Automatically

After selection, Pi immediately switches to that model:

```
[System: Switched to claude-sonnet-4-20250514]
```

---

## Supported Model Families

The extension automatically categorizes models using pattern matching on model IDs and names:

| Family | Pattern | Example IDs Matched |
|--------|---------|---------------------|
| **Claude** | `claude` | `claude-opus-4`, `claude-sonnet-3.5`, `claude-haiku-3` |
| **GPT** | `gpt` | `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1-preview` |
| **Gemini** | `gemini` | `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-ultra` |
| **Llama** | `llama` | `llama3.2`, `llama-3.3-70b`, `codellama-70b` |
| **DeepSeek** | `deepseek` | `deepseek-chat`, `deepseek-r1` |
| **Qwen** | `qwen` | `qwen3.5-397b`, `qwen3-coder`, `qwen3-vl` |
| **MiniMax** | `minimax` | `minimax-m2.5`, `minimax-m2` |
| **Kimi** | `kimi` or `moonshot` | `kimi-k2.5`, `moonshot-v1-32k` |
| **GLM** | `glm` or `chatglm` | `glm-4.7`, `glm-5`, `chatglm3` |
| **Nemotron** | `nemotron` | `nemotron-4-340b`, `nemotron-3-super` |
| **Mistral** | `mistral` | `mistral-large-3`, `mistral-small` |
| **Arcee** | `arcee` or `trinity` | `trinity-large-preview`, `arcee-ai/trinity-mini` |
| **Other** | `router`, `auto` | Router models grouped separately |

**Multi-Provider Grouping:** Models with the same name from different providers (e.g., `Trinity Large Preview` from zen, kilo, cline) are automatically merged into the same family.

**Ollama Models:** Local Ollama models are grouped with their brand families (e.g., `ollama/llama3.2` → Llama family, `ollama/qwen2.5` → Qwen family).

---

## Development

### Running Tests

The extension includes a comprehensive test suite (43 tests) covering model family detection, grouping, and utility functions:

```bash
# Install dependencies
npm install

# Run tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Type check
npm run typecheck
```

### Test Coverage

| Function | Tests |
|----------|-------|
| `isModelFree()` | 5 tests - cost checking edge cases |
| `formatModelName()` | 3 tests - name vs ID handling |
| `getProviders()` | 5 tests - grouping, sorting, free counting |
| `detectModelFamily()` | 42 tests - all model family patterns, ollama, routers, multi-provider |
| `getModelFamilies()` | 5 tests - grouping, sorting, name-based merging |

**Total: 60 tests** covering all major functionality and edge cases.

---

## Installation

### Via pi install (recommended)

```bash
pi install npm:pi-models
```

This installs the package and adds it to your `settings.json` automatically. Run `/reload` in Pi to activate.

### Via settings.json

Add to `~/.pi/agent/settings.json`:

```json
{
  "packages": ["npm:pi-models"]
}
```

Then run `/reload` in Pi.

### Via GitHub (manual)

```bash
cd ~/.pi/agent/extensions
git clone https://github.com/buluma/pi-models.git
```

Or copy just the file:

```bash
cp pi-models.ts ~/.pi/agent/extensions/
```

Run `/reload` in Pi.

---

## Controls Reference

| Key | Action |
|-----|--------|
| `↑` / `↓` or `k` / `j` | Navigate up/down |
| `Enter` | Select highlighted item |
| `Esc` | Go back to previous level / close browser |

---

## Requirements

- Pi v1.0+ with TypeScript extension support
- Models must have configured auth (API keys or local dummy keys like `"ollama"`)

---

## Changelog

### 0.2.1
- **Fixed:** Ollama models now group with brand families instead of separate `ollama-*` families
- **New:** Name-based family merging - models with same name from different providers auto-merge
- **New:** Arcee/Trinity model family support
- **New:** Router models (`router`, `auto`, `kilo-auto/free`) grouped into "Other" family
- **New:** Mistral model family support
- **New:** Complete test suite (60 tests)

### 0.2.0
- **New:** Browse mode selection (By Provider / By Model Family)
- **New:** Automatic model family detection with heuristic pattern matching
- **New:** Multi-provider selection for same model families (e.g., Claude from Anthropic/AWS/Vertex)
- **Improved:** Dynamic column sizing - model names are no longer truncated
- **Improved:** Wider overlays for better visibility
- **Improved:** Free Models accessible in both browse views

### 0.1.0
- Initial release
- Two-level provider → model browsing
- Free models virtual provider
- Local model support (Ollama)

---

**Author:** Apostolos Mantzaris  
**License:** MIT
