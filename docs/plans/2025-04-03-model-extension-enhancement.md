# Pi Models Extension Enhancement Plan

> **For Pi:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix model name truncation, add dynamic column resizing, and implement dual-view browsing (By Provider / By Model Family)

**Architecture:** Three-level menu system (Browse Mode → Category → Selection) using Pi's built-in SelectList and custom components with dynamic width calculation

**Tech Stack:** TypeScript, @mariozechner/pi-tui (SelectList, Container, Text), @mariozechner/pi-coding-agent ExtensionAPI

---

## Current Issues Analysis

1. **Provider names truncated in Level 1**: `SelectList` with `maxPrimaryColumnWidth: 30` clamps column width
2. **Model names truncated in Level 2**: Manual `maxNameWidth` calculation in `showModelList()` subtracts fixed widths
3. **Missing browse mode**: No way to toggle between Provider view and Model Family view
4. **Same model from multiple providers**: Currently only shows one provider's version

---

## Task 1: Fix Truncation in Provider Selection (Level 1)

**Files:**
- Modify: `pi-models.ts:115-125` (SelectList layout options)

**Step 1: Remove max column width constraint**

Change the SelectList layout options to allow dynamic resizing:

```typescript
// Remove maxPrimaryColumnWidth to allow auto-sizing to content
const selectList = new (SelectList as any)(
  items,
  Math.min(items.length, 15),
  {
    selectedPrefix: (t: string) => theme.fg("accent", t),
    selectedText: (t: string) => theme.fg("accent", t),
    description: (t: string) => theme.fg("muted", t),
    scrollInfo: (t: string) => theme.fg("dim", t),
    noMatch: (t: string) => theme.fg("warning", t),
  },
  {
    minPrimaryColumnWidth: 20,
    // REMOVED: maxPrimaryColumnWidth - let it grow to fit content
  },
);
```

**Step 2: Increase overlay width for Level 1**

Change overlay width from "60%" to "80%" to accommodate longer provider names:

```typescript
{
  overlay: true,
  overlayOptions: { width: "80%", minWidth: 50, anchor: "center" },
}
```

**Verification:**
- [ ] Provider names like "anthropic" are fully visible
- [ ] Descriptions still show on the right
- [ ] Layout adjusts to terminal width

---

## Task 2: Fix Truncation in Model Selection (Level 2)

**Files:**
- Modify: `pi-models.ts:showModelList function` (lines ~180-280)

**Step 1: Remove maxNameWidth constraint**

Replace the manual truncation logic with dynamic width calculation:

```typescript
// OLD - Calculate restrictive max width
const maxNameWidth = Math.max(
  10,
  contentWidth - prefixWidth - activeIndicatorWidth - 1,
);

// NEW - Use full available width, only truncate if absolutely necessary
const maxNameWidth = contentWidth - prefixWidth - activeIndicatorWidth - 1;
```

**Step 2: Increase overlay width for Level 2**

Change from "90%" to use full terminal width with high minimum:

```typescript
{
  overlay: true,
  overlayOptions: { width: "95%", minWidth: 80, anchor: "center" },
}
```

**Step 3: Use truncateToWidth only as fallback**

```typescript
// Only truncate if name exceeds available space
const truncatedName = visibleWidth(displayName) > maxNameWidth
  ? truncateToWidth(displayName, maxNameWidth, "…")
  : displayName;
```

**Verification:**
- [ ] Long model names like "claude-sonnet-4-20250501" are fully visible
- [ ] "● active" indicator still shows for active model
- [ ] Terminal width is fully utilized

---

## Task 3: Add Browse Mode Selection (New Level 0)

**Files:**
- Modify: `pi-models.ts:showModelsBrowser function` (add new level)

**Step 1: Create browse mode menu before existing flow**

Insert new Level 0 at the start of `showModelsBrowser`:

```typescript
async function showModelsBrowser(pi: ExtensionAPI, ctx: ExtensionContext) {
  // LEVEL 0: Choose browse mode
  const browseModes: SelectItem[] = [
    { value: "provider", label: "📦 By Provider", description: "Browse by provider (OpenAI, Anthropic, etc.)" },
    { value: "family", label: "🏷️ By Model Family", description: "Browse by model type (GPT-4, Claude, etc.)" },
  ];
  
  const browseMode = await showSelect(ctx, "📦 Browse Models", browseModes);
  if (!browseMode) return;
  
  if (browseMode === "provider") {
    await showProviderView(pi, ctx);
  } else {
    await showFamilyView(pi, ctx);
  }
}
```

**Step 2: Extract current provider logic to `showProviderView`**

Rename/refactor the existing `while (true)` loop to `showProviderView` function.

**Verification:**
- [ ] Browse mode menu appears first
- [ ] Selecting "By Provider" shows current provider list
- [ ] Selecting "By Model Family" shows new family view (implemented in Task 4)

---

## Task 4: Implement Model Family Detection Heuristic

**Files:**
- Modify: `pi-models.ts` (add helper functions)

**Step 1: Create family detection function**

Add before `showModelsBrowser`:

```typescript
interface ModelFamily {
  id: string;           // Normalized family ID (e.g., "claude-sonnet")
  displayName: string;  // Human readable (e.g., "Claude Sonnet")
  models: ModelInfo[];  // All models in this family
}

function detectModelFamily(model: ModelInfo): { familyId: string; familyName: string } | null {
  const id = model.id.toLowerCase();
  const name = (model.name || "").toLowerCase();
  
  // Claude families
  if (id.includes("claude") || name.includes("claude")) {
    if (id.includes("opus") || name.includes("opus")) {
      return { familyId: "claude-opus", familyName: "Claude Opus" };
    }
    if (id.includes("sonnet") || name.includes("sonnet")) {
      return { familyId: "claude-sonnet", familyName: "Claude Sonnet" };
    }
    if (id.includes("haiku") || name.includes("haiku")) {
      return { familyId: "claude-haiku", familyName: "Claude Haiku" };
    }
    return { familyId: "claude-other", familyName: "Claude (Other)" };
  }
  
  // GPT families
  if (id.includes("gpt") || name.includes("gpt")) {
    if (id.includes("4o") || name.includes("4o")) {
      return { familyId: "gpt-4o", familyName: "GPT-4o" };
    }
    if (id.includes("4.5") || name.includes("4.5")) {
      return { familyId: "gpt-4.5", familyName: "GPT-4.5" };
    }
    if (id.includes("4") || name.includes("4")) {
      return { familyId: "gpt-4", familyName: "GPT-4" };
    }
    if (id.includes("3.5") || name.includes("3.5")) {
      return { familyId: "gpt-3.5", familyName: "GPT-3.5" };
    }
    if (id.includes("o1") || name.includes("o1")) {
      return { familyId: "gpt-o1", familyName: "GPT o1" };
    }
    if (id.includes("o3") || name.includes("o3")) {
      return { familyId: "gpt-o3", familyName: "GPT o3" };
    }
    return { familyId: "gpt-other", familyName: "GPT (Other)" };
  }
  
  // Gemini families
  if (id.includes("gemini") || name.includes("gemini")) {
    if (id.includes("ultra") || name.includes("ultra")) {
      return { familyId: "gemini-ultra", familyName: "Gemini Ultra" };
    }
    if (id.includes("pro") || name.includes("pro")) {
      return { familyId: "gemini-pro", familyName: "Gemini Pro" };
    }
    if (id.includes("flash") || name.includes("flash")) {
      return { familyId: "gemini-flash", familyName: "Gemini Flash" };
    }
    return { familyId: "gemini-other", familyName: "Gemini (Other)" };
  }
  
  // Llama families
  if (id.includes("llama") || name.includes("llama")) {
    if (id.includes("3.3") || name.includes("3.3")) {
      return { familyId: "llama-3.3", familyName: "Llama 3.3" };
    }
    if (id.includes("3.2") || name.includes("3.2")) {
      return { familyId: "llama-3.2", familyName: "Llama 3.2" };
    }
    if (id.includes("3.1") || name.includes("3.1")) {
      return { familyId: "llama-3.1", familyName: "Llama 3.1" };
    }
    if (id.includes("3") || name.includes("3")) {
      return { familyId: "llama-3", familyName: "Llama 3" };
    }
    return { familyId: "llama-other", familyName: "Llama (Other)" };
  }
  
  // Ollama models (local)
  if (model.provider === "ollama") {
    // Extract base name before version tag
    const baseName = id.split(":")[0];
    return { 
      familyId: `ollama-${baseName}`, 
      familyName: baseName.charAt(0).toUpperCase() + baseName.slice(1)
    };
  }
  
  // Fallback: use provider + first word of ID
  const firstWord = id.split(/[-_]/)[0];
  return { 
    familyId: `${model.provider}-${firstWord}`,
    familyName: `${model.provider} ${firstWord}`
  };
}
```

**Step 2: Create family grouping function**

```typescript
function getModelFamilies(models: ModelInfo[]): ModelFamily[] {
  const byFamily = new Map<string, ModelInfo[]>();
  
  for (const model of models) {
    const family = detectModelFamily(model);
    if (!family) continue;
    
    const existing = byFamily.get(family.familyId) ?? [];
    existing.push(model);
    byFamily.set(family.familyId, existing);
  }
  
  const families: ModelFamily[] = [];
  for (const [id, models] of byFamily) {
    // Get display name from first model's detection
    const firstModel = models[0]!;
    const familyInfo = detectModelFamily(firstModel)!;
    
    families.push({
      id,
      displayName: familyInfo.familyName,
      models: models.sort((a, b) => b.id.localeCompare(a.id)), // Sort newest first
    });
  }
  
  return families.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
```

**Verification:**
- [ ] "claude-sonnet-4-20250501" → family "Claude Sonnet"
- [ ] "gpt-4o-2024-08-06" → family "GPT-4o"
- [ ] "gemini-1.5-pro" → family "Gemini Pro"
- [ ] Multiple versions of same family grouped together

---

## Task 5: Implement Model Family View

**Files:**
- Modify: `pi-models.ts` (add `showFamilyView` function)

**Step 1: Create family selection level**

```typescript
async function showFamilyView(pi: ExtensionAPI, ctx: ExtensionContext) {
  while (true) {
    const allModels = getAvailableModels(ctx);
    const families = getModelFamilies(allModels);
    
    // Build family items with provider info in description
    const familyItems: SelectItem[] = families.map(f => {
      const providers = [...new Set(f.models.map(m => m.provider))];
      const providerDesc = providers.length > 1 
        ? `Available from ${providers.join(", ")} (${f.models.length} versions)`
        : `From ${providers[0]} (${f.models.length} versions)`;
        
      return {
        value: f.id,
        label: f.displayName,
        description: providerDesc,
      };
    });
    
    // Add Free Models as special family
    const freeModels = allModels.filter(m => m.isFree);
    if (freeModels.length > 0) {
      familyItems.unshift({
        value: "__free",
        label: "🆓 Free Models",
        description: `${freeModels.length} free models across providers`,
      });
    }
    
    const selectedFamilyId = await showSelect(ctx, "🏷️ Model Families", familyItems);
    if (!selectedFamilyId) return; // Esc pressed - go back
    
    // Handle free models
    if (selectedFamilyId === "__free") {
      const selectedModelId = await showModelList(ctx, "🆓 Free Models", freeModels);
      if (!selectedModelId) continue; // Esc - back to family list
      await applyModelSelection(pi, ctx, selectedModelId);
      return;
    }
    
    // Find selected family
    const family = families.find(f => f.id === selectedFamilyId);
    if (!family) continue;
    
    // Check if multiple providers
    const providers = [...new Set(family.models.map(m => m.provider))];
    
    let selectedModel: ModelInfo;
    
    if (providers.length === 1) {
      // Single provider - select latest version directly
      selectedModel = family.models[0]!; // Already sorted newest first
    } else {
      // Multiple providers - show provider selection with latest from each
      const providerItems: SelectItem[] = providers.map(provider => {
        const providerModels = family.models.filter(m => m.provider === provider);
        const latest = providerModels[0]!; // Sorted newest first
        return {
          value: provider,
          label: provider,
          description: `Latest: ${formatModelName(latest)}`,
        };
      });
      
      const selectedProvider = await showSelect(ctx, `🏷️ ${family.displayName} - Select Provider`, providerItems);
      if (!selectedProvider) continue; // Esc - back to family list
      
      // Get latest from selected provider
      const providerModels = family.models.filter(m => m.provider === selectedProvider);
      selectedModel = providerModels[0]!;
    }
    
    // Apply selection
    const modelId = `${selectedModel.provider}/${selectedModel.id}`;
    await applyModelSelection(pi, ctx, modelId);
    return;
  }
}
```

**Step 2: Extract model application to helper**

```typescript
async function applyModelSelection(
  pi: ExtensionAPI, 
  ctx: ExtensionContext, 
  modelRef: string // "provider/modelId" format
): Promise<void> {
  const slashIndex = modelRef.indexOf("/");
  if (slashIndex === -1) return;
  
  const model = ctx.modelRegistry.find(
    modelRef.slice(0, slashIndex),
    modelRef.slice(slashIndex + 1),
  );
  
  if (!model) {
    ctx.ui.notify(`Model not found`, "error");
    return;
  }
  
  const success = await pi.setModel(model);
  ctx.ui.notify(
    success
      ? `Switched to ${model.name || model.id}`
      : `No API key for ${model.provider}`,
    success ? "info" : "error",
  );
}
```

**Verification:**
- [ ] Family view shows all detected families
- [ ] Families with multiple providers show provider list in description
- [ ] Selecting family with one provider directly selects latest version
- [ ] Selecting family with multiple providers shows provider submenu
- [ ] Free models shown as special family at top

---

## Task 6: Ensure Free Models Work in Both Views

**Files:**
- Modify: `pi-models.ts` (update both views)

**Step 1: Verify Free Models in Provider View**

Ensure `showProviderView` keeps the "🆓 Free Models" virtual provider at the top.

**Step 2: Verify Free Models in Family View**

Already added in Task 5 Step 1 - confirm it works correctly.

**Verification:**
- [ ] Free Models appear as first option in Provider view
- [ ] Free Models appear as first option in Family view
- [ ] Selecting Free Models shows all free models across providers

---

## Task 7: Testing and Edge Cases

**Files:**
- Modify: `pi-models.ts` (test with various model configurations)

**Test Scenarios:**

1. **Long provider names**
   - Test with provider name like "vertex-ai-google-cloud" 
   - Should display fully without truncation

2. **Long model names**
   - Test with model ID like "claude-sonnet-4-20250501-extended-version-tag"
   - Should display fully using full terminal width

3. **Same model from multiple providers**
   - If "claude-sonnet-4" exists from both "anthropic" and "aws"
   - Family view should show "Available from anthropic, aws"
   - Selecting should show provider submenu

4. **Single provider family**
   - If only "anthropic" has "claude-opus-4"
   - Selecting family should directly select that model

5. **Local models (Ollama)**
   - Should group by base name (e.g., "llama3.2" different versions together)

6. **Unknown models**
   - Fallback to "provider firstword" naming
   - Should still appear in family view

**Verification:**
- [ ] All scenarios tested manually
- [ ] No truncation of important information
- [ ] Navigation (Esc, Enter, arrows) works in all levels

---

## Execution Order

1. Task 1: Fix Level 1 truncation (quick win)
2. Task 2: Fix Level 2 truncation (quick win)  
3. Task 4: Implement family detection (foundation)
4. Task 3: Add browse mode menu + refactor
5. Task 5: Implement family view
6. Task 6: Verify Free Models in both views
7. Task 7: Test edge cases

---

## Key Code Patterns to Use

**Dynamic width calculation:**
```typescript
overlayOptions: { width: "95%", minWidth: 80, anchor: "center" }
```

**SelectList without max width constraint:**
```typescript
new SelectList(items, maxVisible, theme, { minPrimaryColumnWidth: 20 })
// No maxPrimaryColumnWidth = auto-size to content
```

**Family detection with fallback:**
```typescript
const family = detectModelFamily(model) || { 
  familyId: `${provider}-unknown`, 
  familyName: `${provider} (Unknown)` 
};
```

---

**Plan complete. Ready for subagent-driven-development execution.**
