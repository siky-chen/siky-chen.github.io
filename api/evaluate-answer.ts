declare const process: {
	env: Record<string, string | undefined>;
};

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_BASE_URL =
	process.env.OPENAI_BASE_URL ||
	"https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "qwen3-max";
const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;

const RUBRIC = [
	{
		key: "accuracy",
		label: "准确性",
		weight: 50,
		description: "核心概念是否正确，是否存在明显错误或误导。",
	},
	{
		key: "completeness",
		label: "完整性",
		weight: 35,
		description: "是否覆盖题目的关键点，是否有必要的补充说明。",
	},
	{
		key: "logic",
		label: "逻辑性",
		weight: 10,
		description: "是否结构清楚，表达是否有因果和层次。",
	},
	{
		key: "projectFit",
		label: "项目结合度",
		weight: 5,
		description: "是否能结合真实项目经验、场景或落地做法。",
	},
] as const;

function sendJson(res: any, status: number, body: Record<string, unknown>) {
	Object.entries(corsHeaders).forEach(([key, value]) => {
		res.setHeader(key, value);
	});
	res.status(status).json(body);
}

function buildPrompt(payload: {
	articleTitle?: string;
	sectionTitle?: string;
	subSectionTitle?: string;
	question: string;
	referenceAnswer?: string;
	answer: string;
}) {
	const rubricText = RUBRIC.map((item) => {
		return `- ${item.label}（${item.weight}%）：${item.description}`;
	}).join("\n");

	return [
		"你是一名严谨的机器人与嵌入式面试官。",
		"请严格按照下面的 rubric 给候选人的回答打分，并尽量保持稳定、保守和可解释。",
		"每个维度按 1-5 分评分，5 分最好，1 分最差。",
		"总分按权重换算到 0-100，直接写入 score 字段。",
		"请只输出一个 JSON 对象，不要输出 Markdown 代码块，不要输出额外解释。",
		'JSON 格式必须是：{"score": number, "verdict": string, "summary": string, "rubricScores": [{"key": string, "label": string, "score": number, "weight": number, "reason": string}], "strengths": string[], "improvements": string[], "betterAnswer": string, "followUps": string[]}',
		"评分标准：",
		"- 90-100：回答正确、完整，且能结合项目经验",
		"- 70-89：核心方向正确，但细节或结构还能加强",
		"- 50-69：有部分正确点，但遗漏较多或表达比较散",
		"- 0-49：明显偏题、错误较多或内容过少",
		"",
		"rubric：",
		rubricText,
		"",
		`文章标题：${payload.articleTitle || ""}`,
		`一级章节：${payload.sectionTitle || ""}`,
		`二级章节：${payload.subSectionTitle || ""}`,
		`题目：${payload.question}`,
		`参考答案：${payload.referenceAnswer || "无"}`,
		`候选人答案：${payload.answer}`,
	].join("\n");
}

function parseOutputText(data: any) {
	const content = data?.choices?.[0]?.message?.content;
	if (typeof content === "string" && content.trim()) {
		return content.trim();
	}

	if (Array.isArray(content)) {
		const text = content
			.map((item) => (typeof item?.text === "string" ? item.text : ""))
			.join("")
			.trim();
		if (text) return text;
	}

	return "";
}

function extractJson(text: string) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1].trim() : trimmed;

	try {
		return JSON.parse(candidate);
	} catch {}

	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start >= 0 && end > start) {
		return JSON.parse(candidate.slice(start, end + 1));
	}

	throw new Error("AI 返回内容不是合法 JSON。");
}

function clampScore(value: unknown, min = 0, max = 100) {
	const num = Number(value);
	if (!Number.isFinite(num)) return min;
	return Math.min(max, Math.max(min, Math.round(num)));
}

function normalizeRubricScores(value: unknown) {
	if (!Array.isArray(value)) return [];

	return value
		.map((item) => {
			if (!item || typeof item !== "object") return null;

			const key = typeof item.key === "string" ? item.key : "";
			const label = typeof item.label === "string" ? item.label : "";
			const score = clampScore(item.score, 1, 5);
			const weight = clampScore(item.weight, 0, 100);
			const reason =
				typeof item.reason === "string" ? item.reason.trim() : "";

			if (!key && !label) return null;

			return {
				key,
				label,
				score,
				weight,
				reason,
			};
		})
		.filter(Boolean);
}

export default async function handler(req: any, res: any) {
	if (req.method === "OPTIONS") {
		Object.entries(corsHeaders).forEach(([key, value]) => {
			res.setHeader(key, value);
		});
		res.status(204).end();
		return;
	}

	if (req.method !== "POST") {
		sendJson(res, 405, { error: "Only POST is supported." });
		return;
	}

	if (!API_KEY) {
		sendJson(res, 500, {
			error: "Vercel 环境变量 DASHSCOPE_API_KEY 或 OPENAI_API_KEY 未配置。",
		});
		return;
	}

	try {
		const body =
			typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
		const question = String(body.question || "").trim();
		const answer = String(body.answer || "").trim();

		if (!question || !answer) {
			sendJson(res, 400, {
				error: "题目和回答都不能为空。",
			});
			return;
		}

		const prompt = buildPrompt({
			articleTitle: String(body.articleTitle || ""),
			sectionTitle: String(body.sectionTitle || ""),
			subSectionTitle: String(body.subSectionTitle || ""),
			question,
			referenceAnswer: String(body.referenceAnswer || ""),
			answer,
		});

		const response = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${API_KEY}`,
			},
			body: JSON.stringify({
				model: DEFAULT_MODEL,
				temperature: 0.2,
				messages: [
					{
						role: "system",
						content:
							"你是一名中文技术面试官，只返回 JSON 对象，不要返回任何额外文本。",
					},
					{
						role: "user",
						content: prompt,
					},
				],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			sendJson(res, response.status, {
				error: `LLM 请求失败：${errorText}`,
			});
			return;
		}

		const data = await response.json();
		const outputText = parseOutputText(data);
		if (!outputText) {
			sendJson(res, 502, {
				error: "AI 返回为空，请稍后重试。",
			});
			return;
		}

		const parsed = extractJson(outputText);
		const normalized = {
			...parsed,
			score: clampScore(parsed?.score, 0, 100),
			rubricScores: normalizeRubricScores(parsed?.rubricScores),
		};
		sendJson(res, 200, normalized);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "服务器处理失败。";
		sendJson(res, 500, { error: message });
	}
}
