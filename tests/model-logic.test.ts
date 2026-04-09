import { describe, expect, it } from "vitest";
import {
	detectModelFamily,
	formatModelName,
	getModelFamilies,
	getProviders,
	isModelFree,
	type ModelInfo,
} from "../pi-models";

describe("isModelFree", () => {
	it("returns true when cost is undefined", () => {
		const model = { cost: undefined };
		expect(isModelFree(model)).toBe(true);
	});

	it("returns true when both costs are 0", () => {
		const model = { cost: { input: 0, output: 0 } };
		expect(isModelFree(model)).toBe(true);
	});

	it("returns false when input cost is non-zero", () => {
		const model = { cost: { input: 0.01, output: 0 } };
		expect(isModelFree(model)).toBe(false);
	});

	it("returns false when output cost is non-zero", () => {
		const model = { cost: { input: 0, output: 0.01 } };
		expect(isModelFree(model)).toBe(false);
	});

	it("returns false when both costs are non-zero", () => {
		const model = { cost: { input: 0.01, output: 0.02 } };
		expect(isModelFree(model)).toBe(false);
	});
});

describe("formatModelName", () => {
	it("returns model name when it exists and differs from id", () => {
		const model: ModelInfo = {
			id: "gpt-4",
			name: "GPT-4 Turbo",
			provider: "openai",
			isFree: false,
			inputCost: 0.01,
			outputCost: 0.03,
		};
		expect(formatModelName(model)).toBe("GPT-4 Turbo");
	});

	it("returns id when name is undefined", () => {
		const model: ModelInfo = {
			id: "gpt-4",
			provider: "openai",
			isFree: false,
			inputCost: 0.01,
			outputCost: 0.03,
		};
		expect(formatModelName(model)).toBe("gpt-4");
	});

	it("returns id when name equals id", () => {
		const model: ModelInfo = {
			id: "gpt-4",
			name: "gpt-4",
			provider: "openai",
			isFree: false,
			inputCost: 0.01,
			outputCost: 0.03,
		};
		expect(formatModelName(model)).toBe("gpt-4");
	});
});

describe("getProviders", () => {
	it("groups models by provider", () => {
		const models: ModelInfo[] = [
			{
				id: "gpt-4",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			},
			{
				id: "claude-3",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.075,
			},
		];
		const providers = getProviders(models);
		expect(providers).toHaveLength(2);
		expect(providers.map((p) => p.id)).toContain("openai");
		expect(providers.map((p) => p.id)).toContain("anthropic");
	});

	it("sorts providers alphabetically", () => {
		const models: ModelInfo[] = [
			{
				id: "gpt-4",
				provider: "zebra",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			},
			{
				id: "claude-3",
				provider: "alpha",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.075,
			},
		];
		const providers = getProviders(models);
		expect(providers[0].id).toBe("alpha");
		expect(providers[1].id).toBe("zebra");
	});

	it("counts free models per provider", () => {
		const models: ModelInfo[] = [
			{
				id: "gpt-4",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			},
			{
				id: "gpt-3.5",
				provider: "openai",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			},
		];
		const providers = getProviders(models);
		expect(providers[0].freeCount).toBe(1);
	});

	it("sorts models within provider alphabetically", () => {
		const models: ModelInfo[] = [
			{
				id: "gpt-4",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			},
			{
				id: "gpt-3.5",
				provider: "openai",
				isFree: false,
				inputCost: 0.0005,
				outputCost: 0.0015,
			},
		];
		const providers = getProviders(models);
		expect(providers[0].models[0].id).toBe("gpt-3.5");
		expect(providers[0].models[1].id).toBe("gpt-4");
	});
});

describe("detectModelFamily", () => {
	describe("Claude family", () => {
		it("detects Claude Opus", () => {
			const model: ModelInfo = {
				id: "claude-3-opus-4",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.075,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "claude",
				familyName: "Claude",
			});
		});

		it("detects Claude Sonnet", () => {
			const model: ModelInfo = {
				id: "claude-3-sonnet",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.003,
				outputCost: 0.015,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "claude",
				familyName: "Claude",
			});
		});

		it("detects Claude Haiku", () => {
			const model: ModelInfo = {
				id: "claude-3-haiku",
				provider: "anthropic",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "claude",
				familyName: "Claude",
			});
		});

		it("detects Claude from name when not in id", () => {
			const model: ModelInfo = {
				id: "anthropic-model-123",
				name: "Claude Instant",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.005,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "claude",
				familyName: "Claude",
			});
		});
	});

	describe("GPT family", () => {
		it("detects GPT-4o", () => {
			const model: ModelInfo = {
				id: "gpt-4o-2024-08-06",
				provider: "openai",
				isFree: false,
				inputCost: 0.0025,
				outputCost: 0.01,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gpt",
				familyName: "GPT",
			});
		});

		it("detects GPT-4", () => {
			const model: ModelInfo = {
				id: "gpt-4-turbo",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gpt",
				familyName: "GPT",
			});
		});

		it("detects GPT-3.5", () => {
			const model: ModelInfo = {
				id: "gpt-3.5-turbo",
				provider: "openai",
				isFree: false,
				inputCost: 0.0005,
				outputCost: 0.0015,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gpt",
				familyName: "GPT",
			});
		});
	});

	describe("OpenAI o family", () => {
		it("detects OpenAI o1", () => {
			const model: ModelInfo = {
				id: "o1-preview",
				provider: "openai",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.06,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "openai-o",
				familyName: "OpenAI o",
			});
		});

		it("detects OpenAI o3", () => {
			const model: ModelInfo = {
				id: "o3-mini",
				provider: "openai",
				isFree: false,
				inputCost: 0.0011,
				outputCost: 0.0044,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "openai-o",
				familyName: "OpenAI o",
			});
		});
	});

	describe("Gemini family", () => {
		it("detects Gemini Ultra", () => {
			const model: ModelInfo = {
				id: "gemini-1.0-ultra",
				provider: "google",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.01,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gemini",
				familyName: "Gemini",
			});
		});

		it("detects Gemini Pro", () => {
			const model: ModelInfo = {
				id: "gemini-1.5-pro",
				provider: "google",
				isFree: false,
				inputCost: 0.00125,
				outputCost: 0.005,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gemini",
				familyName: "Gemini",
			});
		});

		it("detects Gemini Flash", () => {
			const model: ModelInfo = {
				id: "gemini-1.5-flash",
				provider: "google",
				isFree: false,
				inputCost: 0.000075,
				outputCost: 0.0003,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gemini",
				familyName: "Gemini",
			});
		});
	});

	describe("Llama family", () => {
		it("detects Llama 3.3", () => {
			const model: ModelInfo = {
				id: "llama-3.3-70b",
				provider: "groq",
				isFree: false,
				inputCost: 0.0009,
				outputCost: 0.0009,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "llama",
				familyName: "Llama",
			});
		});

		it("detects Llama 3.2", () => {
			const model: ModelInfo = {
				id: "llama-3.2-1b",
				provider: "groq",
				isFree: false,
				inputCost: 0.0005,
				outputCost: 0.0005,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "llama",
				familyName: "Llama",
			});
		});

		it("detects Llama 3.1", () => {
			const model: ModelInfo = {
				id: "llama-3.1-8b",
				provider: "groq",
				isFree: false,
				inputCost: 0.0005,
				outputCost: 0.0005,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "llama",
				familyName: "Llama",
			});
		});

		it("detects Llama 3", () => {
			const model: ModelInfo = {
				id: "llama-3-8b",
				provider: "groq",
				isFree: false,
				inputCost: 0.0005,
				outputCost: 0.0005,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "llama",
				familyName: "Llama",
			});
		});
	});

	describe("DeepSeek family", () => {
		it("detects DeepSeek R1", () => {
			const model: ModelInfo = {
				id: "deepseek-r1",
				provider: "deepseek",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "deepseek",
				familyName: "DeepSeek",
			});
		});

		it("detects DeepSeek Chat", () => {
			const model: ModelInfo = {
				id: "deepseek-chat",
				provider: "deepseek",
				isFree: false,
				inputCost: 0.0005,
				outputCost: 0.001,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "deepseek",
				familyName: "DeepSeek",
			});
		});

		it("detects DeepSeek v3.x versions via provider fallback", () => {
			const model: ModelInfo = {
				id: "v3.1",
				provider: "deepseek",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "deepseek",
				familyName: "DeepSeek",
			});
		});

		it("detects DeepSeek keyword in any position of versioned ID", () => {
			const model: ModelInfo = {
				id: "2024-v3-deepseek-chat",
				provider: "openrouter",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "deepseek",
				familyName: "DeepSeek",
			});
		});
	});

	describe("MiniMax family", () => {
		it("detects MiniMax from minimaxai provider", () => {
			const model: ModelInfo = {
				id: "minimaxai-text-01",
				provider: "minimaxai",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "minimax",
				familyName: "MiniMax",
			});
		});

		it("detects MiniMax from minimax provider", () => {
			const model: ModelInfo = {
				id: "minimax-text-01",
				provider: "minimax",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "minimax",
				familyName: "MiniMax",
			});
		});

		it("detects MiniMax m2.5 variant", () => {
			const model: ModelInfo = {
				id: "minimax-m2.5",
				provider: "minimax",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "minimax",
				familyName: "MiniMax",
			});
		});

		it("detects MiniMax when prefixed with provider", () => {
			const model: ModelInfo = {
				id: "openrouter-minimax-m2.5",
				provider: "openrouter",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "minimax",
				familyName: "MiniMax",
			});
		});
	});

	describe("GLM family", () => {
		it("detects GLM from id", () => {
			const model: ModelInfo = {
				id: "glm-4",
				provider: "zhipu",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "glm",
				familyName: "GLM",
			});
		});

		it("detects GLM from name", () => {
			const model: ModelInfo = {
				id: "some-id",
				name: "GLM-4 Plus",
				provider: "zhipu",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "glm",
				familyName: "GLM",
			});
		});

		it("detects GLM from zhipu provider fallback", () => {
			const model: ModelInfo = {
				id: "4v",
				provider: "zhipu",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "glm",
				familyName: "GLM",
			});
		});

		it("detects GLM from name when ID starts with version", () => {
			const model: ModelInfo = {
				id: "4.5-flash",
				name: "GLM 4.5 Flash",
				provider: "openrouter",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "glm",
				familyName: "GLM",
			});
		});

		it("detects GLM keyword in any position of versioned ID", () => {
			const model: ModelInfo = {
				id: "v1.5-glm-4",
				provider: "openrouter",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "glm",
				familyName: "GLM",
			});
		});
	});

	describe("Qwen family", () => {
		it("detects Qwen", () => {
			const model: ModelInfo = {
				id: "qwen-2.5-72b",
				provider: "kilo",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "qwen",
				familyName: "Qwen",
			});
		});

		it("detects Qwen from name", () => {
			const model: ModelInfo = {
				id: "some-model-id",
				name: "Qwen 2.5",
				provider: "openrouter",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "qwen",
				familyName: "Qwen",
			});
		});

		it("detects Qwen when prefixed with provider", () => {
			const model: ModelInfo = {
				id: "kilo-qwen-2.5-72b",
				provider: "kilo",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "qwen",
				familyName: "Qwen",
			});
		});
	});

	describe("Nemotron family", () => {
		it("detects Nemotron", () => {
			const model: ModelInfo = {
				id: "nemotron-4-340b",
				provider: "nvidia",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "nemotron",
				familyName: "Nemotron",
			});
		});

		it("detects Nemotron when prefixed with provider", () => {
			const model: ModelInfo = {
				id: "nvidia-nemotron-4-340b",
				provider: "nvidia",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "nemotron",
				familyName: "Nemotron",
			});
		});
	});

	describe("Kimi family", () => {
		it("detects Kimi", () => {
			const model: ModelInfo = {
				id: "kimi-k2",
				provider: "kilo",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.02,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "kimi",
				familyName: "Kimi",
			});
		});

		it("detects Kimi when prefixed with provider", () => {
			const model: ModelInfo = {
				id: "kilo-kimi-k2",
				provider: "kilo",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.02,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "kimi",
				familyName: "Kimi",
			});
		});
	});

	describe("Ollama (local) models", () => {
		it("groups ollama llama models with llama family", () => {
			const model: ModelInfo = {
				id: "llama3.2:latest",
				provider: "ollama",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "llama",
				familyName: "Llama",
			});
		});

		it("groups ollama qwen models with qwen family", () => {
			const model: ModelInfo = {
				id: "qwen2.5",
				provider: "ollama",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "qwen",
				familyName: "Qwen",
			});
		});
	});

	describe("Fallback handling", () => {
		it("uses first word for unknown models", () => {
			const model: ModelInfo = {
				id: "custom-model-v1",
				provider: "some-provider",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.02,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "custom",
				familyName: "Custom",
			});
		});

		it("handles model id with underscores", () => {
			const model: ModelInfo = {
				id: "model_name_here",
				provider: "test",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "model",
				familyName: "Model",
			});
		});
	});

	describe("Case insensitivity", () => {
		it("handles uppercase model IDs", () => {
			const model: ModelInfo = {
				id: "CLAUDE-3-OPUS",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.075,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "claude",
				familyName: "Claude",
			});
		});

		it("handles mixed case model names", () => {
			const model: ModelInfo = {
				id: "gpt-4",
				name: "GPT-4 Turbo",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			};
			expect(detectModelFamily(model)).toEqual({
				familyId: "gpt",
				familyName: "GPT",
			});
		});
	});
});

describe("getModelFamilies", () => {
	it("groups models by detected family", () => {
		const models: ModelInfo[] = [
			{
				id: "claude-opus-4",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.075,
			},
			{
				id: "gpt-4",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			},
			{
				id: "claude-sonnet",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.003,
				outputCost: 0.015,
			},
		];

		const families = getModelFamilies(models);

		// Should group by top-level family
		expect(families).toHaveLength(2);
		const familyNames = families.map((f) => f.displayName);
		expect(familyNames).toContain("Claude");
		expect(familyNames).toContain("GPT");

		// Claude family should have both Claude models
		const claudeFamily = families.find((f) => f.id === "claude");
		expect(claudeFamily?.models).toHaveLength(2);
	});

	it("sorts families alphabetically by display name", () => {
		const models: ModelInfo[] = [
			{
				id: "gpt-4",
				provider: "openai",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.03,
			},
			{
				id: "claude-opus",
				provider: "anthropic",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.075,
			},
			{
				id: "gemini-pro",
				provider: "google",
				isFree: false,
				inputCost: 0.00125,
				outputCost: 0.005,
			},
		];

		const families = getModelFamilies(models);

		expect(families.map((f) => f.displayName)).toEqual([
			"Claude",
			"Gemini",
			"GPT",
		]);
	});

	it("handles empty model list", () => {
		const families = getModelFamilies([]);
		expect(families).toEqual([]);
	});

	it("groups same models from different providers into single family", () => {
		const models: ModelInfo[] = [
			{
				id: "kimi-k2",
				provider: "kilo",
				isFree: false,
				inputCost: 0.01,
				outputCost: 0.02,
			},
			{
				id: "kimi-k2",
				provider: "openrouter",
				isFree: false,
				inputCost: 0.015,
				outputCost: 0.025,
			},
		];

		const families = getModelFamilies(models);

		expect(families).toHaveLength(1);
		expect(families[0].id).toBe("kimi");
		expect(families[0].models).toHaveLength(2);
		// Should be sorted by provider
		expect(families[0].models[0].provider).toBe("kilo");
		expect(families[0].models[1].provider).toBe("openrouter");
	});

	it("groups minimax and minimaxai into same family", () => {
		const models: ModelInfo[] = [
			{
				id: "minimax-text-01",
				provider: "minimax",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			},
			{
				id: "minimaxai-text-01",
				provider: "minimaxai",
				isFree: false,
				inputCost: 0.001,
				outputCost: 0.002,
			},
		];

		const families = getModelFamilies(models);

		expect(families).toHaveLength(1);
		expect(families[0].id).toBe("minimax");
		expect(families[0].models).toHaveLength(2);
	});

	it("handles models that fail family detection gracefully", () => {
		// All models should get at least a fallback family
		const models: ModelInfo[] = [
			{
				id: "model1",
				provider: "test",
				isFree: true,
				inputCost: 0,
				outputCost: 0,
			},
		];

		const families = getModelFamilies(models);

		expect(families).toHaveLength(1);
		expect(families[0].id).toBe("model1");
	});
});
