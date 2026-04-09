/**
 * Pi Models Extension
 *
 * Three-level menu:
 *   1. Browse mode: Choose "By Provider" or "By Model Family"
 *   2. Category: Provider list OR Model family list
 *   3. Selection: Model list (with provider submenu for multi-provider families)
 *
 * "Free Models" is always listed first as a virtual option in both views.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
	Container,
	matchesKey,
	type SelectItem,
	SelectList,
	Spacer,
	Text,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";

export interface ModelInfo {
	id: string;
	name?: string;
	provider: string;
	isFree: boolean;
	inputCost: number;
	outputCost: number;
}

export function isModelFree(model: {
	cost?: { input: number; output: number };
}): boolean {
	if (!model.cost) return true;
	return model.cost.input === 0 && model.cost.output === 0;
}

function getAvailableModels(ctx: ExtensionContext): ModelInfo[] {
	return ctx.modelRegistry.getAvailable().map((m) => ({
		id: m.id,
		name: m.name,
		provider: m.provider,
		isFree: isModelFree(m),
		inputCost: m.cost?.input ?? 0,
		outputCost: m.cost?.output ?? 0,
	}));
}

export function formatModelName(model: ModelInfo): string {
	return model.name && model.name !== model.id ? model.name : model.id;
}

export interface Provider {
	id: string;
	name: string;
	models: ModelInfo[];
	freeCount: number;
}

export function getProviders(models: ModelInfo[]): Provider[] {
	const byProvider = new Map<string, ModelInfo[]>();
	for (const m of models) {
		const existing = byProvider.get(m.provider) ?? [];
		existing.push(m);
		byProvider.set(m.provider, existing);
	}

	const providers: Provider[] = [];
	for (const [id, models] of byProvider) {
		providers.push({
			id,
			name: id,
			models: models.sort((a, b) => a.id.localeCompare(b.id)),
			freeCount: models.filter((m) => m.isFree).length,
		});
	}
	return providers.sort((a, b) => a.id.localeCompare(b.id));
}

export interface ModelFamily {
	id: string; // Normalized family ID (e.g., "claude-sonnet")
	displayName: string; // Human readable (e.g., "Claude Sonnet")
	models: ModelInfo[]; // All models in this family
}

export function detectModelFamily(
	model: ModelInfo,
): { familyId: string; familyName: string } | null {
	const id = model.id.toLowerCase();
	const name = (model.name || "").toLowerCase();
	const fullText = `${id} ${name}`;

	// Router models (gateways to free models) - group into "Other"
	// Match "router" or "auto" as whole words, or specific known router IDs
	if (
		/\brouter\b/.test(fullText) ||
		/\bauto\b/.test(fullText) ||
		id === "kilo-auto/free"
	) {
		return { familyId: "other", familyName: "Other" };
	}

	// Known brand keywords to check in ID and name
	// Order matters: more specific/longer matches should come before shorter ones
	const brandMappings: {
		keywords: string[];
		familyId: string;
		familyName: string;
	}[] = [
		{ keywords: ["claude"], familyId: "claude", familyName: "Claude" },
		{ keywords: ["deepseek"], familyId: "deepseek", familyName: "DeepSeek" },
		{ keywords: ["gemini"], familyId: "gemini", familyName: "Gemini" },
		{ keywords: ["gpt"], familyId: "gpt", familyName: "GPT" },
		{ keywords: ["llama"], familyId: "llama", familyName: "Llama" },
		{ keywords: ["minimax"], familyId: "minimax", familyName: "MiniMax" },
		{ keywords: ["qwen"], familyId: "qwen", familyName: "Qwen" },
		{ keywords: ["nemotron"], familyId: "nemotron", familyName: "Nemotron" },
		{ keywords: ["kimi", "moonshot"], familyId: "kimi", familyName: "Kimi" },
		{ keywords: ["glm", "chatglm"], familyId: "glm", familyName: "GLM" },
		{ keywords: ["mistral"], familyId: "mistral", familyName: "Mistral" },
		{ keywords: ["arcee", "trinity"], familyId: "arcee", familyName: "Arcee" },
		{ keywords: ["o1", "o3"], familyId: "openai-o", familyName: "OpenAI o" },
	];

	// Check for known brands in ID or name
	for (const mapping of brandMappings) {
		for (const keyword of mapping.keywords) {
			if (fullText.includes(keyword)) {
				return { familyId: mapping.familyId, familyName: mapping.familyName };
			}
		}
	}

	// Provider-specific fallbacks for models without brand in ID/name
	const providerMappings: Record<
		string,
		{ familyId: string; familyName: string }
	> = {
		minimax: { familyId: "minimax", familyName: "MiniMax" },
		minimaxai: { familyId: "minimax", familyName: "MiniMax" },
		deepseek: { familyId: "deepseek", familyName: "DeepSeek" },
		nvidia: { familyId: "nemotron", familyName: "Nemotron" },
		moonshot: { familyId: "kimi", familyName: "Kimi" },
		zhipu: { familyId: "glm", familyName: "GLM" },
	};

	if (providerMappings[model.provider]) {
		return providerMappings[model.provider];
	}

	// Helper function to check if any part matches a brand keyword
	function findBrandInParts(
		parts: string[],
	): { familyId: string; familyName: string } | null {
		for (const part of parts) {
			for (const mapping of brandMappings) {
				for (const keyword of mapping.keywords) {
					if (part.includes(keyword)) {
						return {
							familyId: mapping.familyId,
							familyName: mapping.familyName,
						};
					}
				}
			}
		}
		return null;
	}

	// Smart fallback: try to identify the brand from the model ID structure
	// Common patterns: "brand-model-version" or "brand-model"
	const parts = id.split(/[-_:.]/);

	// If ID starts with a version number (like "4.5" or "v3"), check remaining parts for brand
	const firstPart = parts[0];
	if (firstPart && /^v?\d+(\.\d+)?$/.test(firstPart)) {
		// ID starts with version number - check if name contains a known brand
		for (const mapping of brandMappings) {
			for (const keyword of mapping.keywords) {
				if (name.includes(keyword)) {
					return { familyId: mapping.familyId, familyName: mapping.familyName };
				}
			}
		}

		// Check ALL remaining parts for brand keywords (not just second part)
		// e.g., "4.5-glm-flash", "v3.5-ai21-jamba", "2024-08-claude"
		const brandFromParts = findBrandInParts(parts.slice(1));
		if (brandFromParts) {
			return brandFromParts;
		}
	}

	// If ID has multiple parts, check ALL parts for brand keywords
	// e.g., "kilo-qwen", "openrouter-claude", "fireworks-llama"
	if (parts.length > 1) {
		const brandFromParts = findBrandInParts(parts);
		if (brandFromParts) {
			return brandFromParts;
		}

		// Use first part as brand if it looks brand-like (not just a version number)
		if (firstPart && !/^v?\d+(\.\d+)?$/.test(firstPart)) {
			return {
				familyId: firstPart,
				familyName: firstPart.charAt(0).toUpperCase() + firstPart.slice(1),
			};
		}
	}

	// Last resort: use first non-version part, or full ID
	// If first part is a version number and we have more parts, try to find a brand-like part
	if (firstPart && /^v?\d+(\.\d+)?$/.test(firstPart) && parts.length > 1) {
		// Look for a non-numeric part to use as family name
		for (let i = 1; i < parts.length; i++) {
			const part = parts[i];
			// Use first non-numeric, non-empty part that's not a common suffix
			if (
				part &&
				!/^v?\d+(\.\d+)?$/.test(part) &&
				!["latest", "preview", "rc", "beta", "alpha", "dev"].includes(part)
			) {
				return {
					familyId: part,
					familyName: part.charAt(0).toUpperCase() + part.slice(1),
				};
			}
		}
	}

	return {
		familyId: firstPart || id,
		familyName:
			(firstPart || id).charAt(0).toUpperCase() + (firstPart || id).slice(1),
	};
}

/**
 * Normalize a model name for comparison by removing provider-specific suffixes
 * and common qualifiers. This helps detect when the same model is offered by
 * multiple providers with slightly different naming.
 */
function normalizeModelName(name: string): string {
	return (
		name
			.toLowerCase()
			// Remove common suffixes added by providers
			.replace(/\s*\(free\)\s*$/i, "")
			.replace(/\s*\(cline\)\s*$/i, "")
			.replace(/\s*\(ci:\s*[\d.]+\)\s*$/i, "") // CI scores like [CI: 29.2]
			.replace(/\s*\[ci:\s*[\d.]+\]\s*$/i, "")
			.replace(/\s*\([^)]*\)\s*$/g, "") // Remove any trailing parenthetical
			.trim()
	);
}

export function getModelFamilies(models: ModelInfo[]): ModelFamily[] {
	const byFamily = new Map<string, ModelInfo[]>();
	const nameToFamilyId = new Map<string, string>();

	for (const model of models) {
		const family = detectModelFamily(model);
		if (!family) continue;

		const existing = byFamily.get(family.familyId) ?? [];
		existing.push(model);
		byFamily.set(family.familyId, existing);
	}

	// Second pass: merge families with models that have the same normalized name
	// This catches cases where the same model from different providers gets
	// different family IDs (e.g., "Trinity Large Preview" from zen vs arcee)
	const familyIds = [...byFamily.keys()];
	for (const familyId of familyIds) {
		const familyModels = byFamily.get(familyId);
		if (!familyModels) continue;

		for (const model of familyModels) {
			const normalizedName = normalizeModelName(model.name || model.id);
			if (!normalizedName) continue;

			const existingFamilyForName = nameToFamilyId.get(normalizedName);
			if (existingFamilyForName && existingFamilyForName !== familyId) {
				// Same model name found in different family - merge them
				const targetFamily = byFamily.get(existingFamilyForName);
				const sourceFamily = byFamily.get(familyId);
				if (targetFamily && sourceFamily) {
					// Move all models from source to target
					targetFamily.push(...sourceFamily);
					byFamily.delete(familyId);
					break; // This family is gone, move to next
				}
			} else {
				nameToFamilyId.set(normalizedName, familyId);
			}
		}
	}

	const families: ModelFamily[] = [];
	for (const [id, models] of byFamily) {
		// Get display name from first model's detection
		const firstModel = models[0]!;
		const familyInfo = detectModelFamily(firstModel)!;

		families.push({
			id,
			displayName: familyInfo.familyName,
			models: models.sort(
				(a, b) =>
					a.provider.localeCompare(b.provider) || b.id.localeCompare(a.id),
			), // Sort by provider, then newest first
		});
	}

	return families.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function applyModelSelection(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	modelRef: string, // "provider/modelId" format
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

export default function (pi: ExtensionAPI) {
	pi.registerCommand("models", {
		description: "Browse and select models",
		handler: async (_args, ctx) => {
			await showModelsBrowser(pi, ctx);
		},
	});
}

async function showModelsBrowser(pi: ExtensionAPI, ctx: ExtensionContext) {
	// LEVEL 0: Choose browse mode
	const browseModes: SelectItem[] = [
		{
			value: "provider",
			label: "📦 By Provider",
			description: "Browse by provider (OpenAI, Anthropic, etc.)",
		},
		{
			value: "family",
			label: "🏷️ By Model Family",
			description: "Browse by model type (GPT-4, Claude, etc.)",
		},
	];

	const browseMode = await showSelect(ctx, "📦 Browse Models", browseModes);
	if (!browseMode) return;

	if (browseMode === "provider") {
		await showProviderView(pi, ctx);
	} else {
		await showFamilyView(pi, ctx);
	}
}

async function showFamilyView(pi: ExtensionAPI, ctx: ExtensionContext) {
	while (true) {
		const allModels = getAvailableModels(ctx);
		const families = getModelFamilies(allModels);

		// Build family items with provider info in description
		const familyItems: SelectItem[] = families.map((f) => {
			const providers = [...new Set(f.models.map((m) => m.provider))];
			const providerDesc =
				providers.length > 1
					? `Available from ${providers.join(", ")} (${f.models.length} versions)`
					: `From ${providers[0]} (${f.models.length} versions)`;

			return {
				value: f.id,
				label: f.displayName,
				description: providerDesc,
			};
		});

		// Add Free Models as special family
		const freeModels = allModels.filter((m) => m.isFree);
		if (freeModels.length > 0) {
			familyItems.unshift({
				value: "__free",
				label: "🆓 Free Models",
				description: `${freeModels.length} free models across providers`,
			});
		}

		const selectedFamilyId = await showSelect(
			ctx,
			"🏷️ Model Families",
			familyItems,
			() => "__toggle", // Return toggle sentinel on Tab
		);
		if (!selectedFamilyId) {
			await showModelsBrowser(pi, ctx);
			return;
		}

		// Handle toggle to provider view
		if (selectedFamilyId === "__toggle") {
			await showProviderView(pi, ctx);
			return;
		}

		// Handle free models
		if (selectedFamilyId === "__free") {
			const selectedModelId = await showModelList(
				ctx,
				"🆓 Free Models",
				freeModels,
			);
			if (!selectedModelId) continue; // Esc - back to family list
			await applyModelSelection(pi, ctx, selectedModelId);
			return;
		}

		// Find selected family
		const family = families.find((f) => f.id === selectedFamilyId);
		if (!family) continue;

		// Show all models from all providers for this family
		const selectedModelId = await showModelList(
			ctx,
			`🏷️ ${family.displayName}`,
			family.models,
		);
		if (!selectedModelId) continue; // Esc - back to family list
		await applyModelSelection(pi, ctx, selectedModelId);
		return;
	}
}

async function showProviderView(pi: ExtensionAPI, ctx: ExtensionContext) {
	while (true) {
		const allModels = getAvailableModels(ctx);
		const providers = getProviders(allModels);
		const freeModels = allModels
			.filter((m) => m.isFree)
			.sort(
				(a, b) =>
					a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id),
			);

		// Level 1: Provider selection
		const providerItems: SelectItem[] = [
			{
				value: "__free",
				label: "🆓 Free Models",
				description: `${freeModels.length} models`,
			},
		];
		for (const p of providers) {
			const desc =
				p.freeCount > 0
					? `${p.models.length} models (${p.freeCount} free)`
					: `${p.models.length} models`;
			providerItems.push({ value: p.id, label: p.name, description: desc });
		}

		const selectedProvider = await showSelect(
			ctx,
			"📦 Models",
			providerItems,
			() => "__toggle", // Return toggle sentinel on Tab
		);
		if (!selectedProvider) {
			await showModelsBrowser(pi, ctx);
			return;
		}

		// Handle toggle to family view
		if (selectedProvider === "__toggle") {
			await showFamilyView(pi, ctx);
			return;
		}

		// Build model list based on selection
		let modelItems: ModelInfo[];
		let sectionTitle: string;

		if (selectedProvider === "__free") {
			sectionTitle = "🆓 Free Models";
			modelItems = freeModels;
		} else {
			const provider = providers.find((p) => p.id === selectedProvider);
			if (!provider) continue;
			sectionTitle = `📦 ${provider.name}`;
			modelItems = provider.models;
		}

		if (modelItems.length === 0) {
			ctx.ui.notify("No models in this category", "info");
			continue;
		}

		// Level 2: Model selection
		const selectedModelId = await showModelList(ctx, sectionTitle, modelItems);
		if (!selectedModelId) continue; // Esc pressed - go back to level 1

		await applyModelSelection(pi, ctx, selectedModelId);
		return;
	}
}

// Level 1: Uses SelectList for provider selection (has descriptions, needs columns)
async function showSelect(
	ctx: ExtensionContext,
	title: string,
	items: SelectItem[],
	onToggle?: () => string | null,
): Promise<string | null> {
	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const container = new Container();
			container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
			container.addChild(new Spacer(1));

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
					// No maxPrimaryColumnWidth - allow auto-sizing to content
				},
			);

			selectList.onSelect = (item: SelectItem) => done(item.value);
			selectList.onCancel = () => done(null);
			container.addChild(selectList);

			container.addChild(new Spacer(1));
			const helpText = onToggle
				? "↑↓ navigate • enter select • esc back • tab toggle view"
				: "↑↓ navigate • enter select • esc back";
			container.addChild(new Text(theme.fg("dim", helpText), 1, 0));

			return {
				render: (w: number) => container.render(w),
				invalidate: () => container.invalidate(),
				handleInput: (data: string) => {
					// Handle Tab for toggle if callback provided
					if (onToggle && matchesKey(data, "tab")) {
						done(onToggle());
						return;
					}
					selectList.handleInput(data);
				},
			};
		},
		{
			overlay: true,
			overlayOptions: { width: "80%", minWidth: 50, anchor: "center" },
		},
	);
}

// Level 2: Custom model list without column constraints (no truncation)
async function showModelList(
	ctx: ExtensionContext,
	title: string,
	models: ModelInfo[],
): Promise<string | null> {
	return ctx.ui.custom<string | null>(
		(_tui, theme, _kb, done) => {
			const state = {
				selectedIndex: 0,
				offset: 0,
				lastWidth: 80,
			};
			const maxVisible = 15;

			const container = new Container();

			const render = () => {
				container.clear();
				container.addChild(
					new Text(theme.fg("accent", theme.bold(title)), 1, 0),
				);
				container.addChild(new Spacer(1));

				const startIdx = state.offset;
				const endIdx = Math.min(startIdx + maxVisible, models.length);

				// Content width inside Text (paddingX=1 on each side)
				const contentWidth = Math.max(20, state.lastWidth - 2);
				const prefixWidth = 2; // "→ " or "  "
				const activeIndicator = " ● active";
				const activeIndicatorWidth = visibleWidth(activeIndicator);

				// Check if we have multiple providers
				const providers = [...new Set(models.map((m) => m.provider))];
				const showProviders = providers.length > 1;

				for (let i = startIdx; i < endIdx; i++) {
					const model = models[i];
					const isSelected = i === state.selectedIndex;
					let displayName = formatModelName(model);
					// Add provider prefix, stripping it from model name if already present to avoid duplication
					if (showProviders) {
						const providerLower = model.provider.toLowerCase();
						const nameLower = displayName.toLowerCase();
						if (
							nameLower.startsWith(providerLower + " ") ||
							nameLower.startsWith(providerLower + "-")
						) {
							// Strip provider prefix from name to avoid duplication
							displayName = displayName.slice(model.provider.length + 1).trim();
						}
						displayName = `[${model.provider}] ${displayName}`;
					}
					const isActive = model.id === ctx.model?.id;

					// Use truncateToWidth for proper ANSI-safe truncation only if needed
					const maxNameWidth =
						contentWidth - prefixWidth - activeIndicatorWidth - 1;
					const truncatedName = truncateToWidth(displayName, maxNameWidth, "…");

					let line: string;
					if (isSelected) {
						const prefix = "→ ";
						const name = theme.fg("accent", truncatedName);
						const active = isActive ? theme.fg("success", activeIndicator) : "";
						line = `${prefix}${name}${active}`;
					} else {
						const prefix = "  ";
						const active = isActive ? theme.fg("success", activeIndicator) : "";
						line = `${prefix}${truncatedName}${active}`;
					}
					container.addChild(new Text(line, 1, 0));
				}

				// Scroll indicator
				if (models.length > maxVisible) {
					container.addChild(new Spacer(1));
					const scrollText = `  ${state.selectedIndex + 1}/${models.length}`;
					container.addChild(new Text(theme.fg("dim", scrollText), 1, 0));
				}

				container.addChild(new Spacer(1));
				container.addChild(
					new Text(
						theme.fg("dim", "↑↓ navigate • enter select • esc back"),
						1,
						0,
					),
				);
			};

			const handleInput = (keyData: string) => {
				if (matchesKey(keyData, "up") || keyData === "k") {
					state.selectedIndex =
						state.selectedIndex === 0
							? models.length - 1
							: state.selectedIndex - 1;
					if (state.selectedIndex < state.offset) {
						state.offset = state.selectedIndex;
					}
					if (state.selectedIndex === models.length - 1) {
						state.offset = Math.max(0, models.length - maxVisible);
					}
					render();
				} else if (matchesKey(keyData, "down") || keyData === "j") {
					state.selectedIndex =
						state.selectedIndex === models.length - 1
							? 0
							: state.selectedIndex + 1;
					if (state.selectedIndex >= state.offset + maxVisible) {
						state.offset = state.selectedIndex - maxVisible + 1;
					}
					if (state.selectedIndex === 0) {
						state.offset = 0;
					}
					render();
				} else if (matchesKey(keyData, "return")) {
					const model = models[state.selectedIndex];
					if (model) {
						done(`${model.provider}/${model.id}`);
					}
				} else if (matchesKey(keyData, "escape")) {
					done(null);
				}
			};

			// Initial render
			render();

			return {
				render: (w: number) => {
					state.lastWidth = w;
					return container.render(w);
				},
				invalidate: () => container.invalidate(),
				handleInput,
			};
		},
		{
			overlay: true,
			overlayOptions: { width: "95%", minWidth: 80, anchor: "center" },
		},
	);
}
