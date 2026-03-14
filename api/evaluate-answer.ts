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
	return [
		"你是一名严谨但鼓励式的机器人与嵌入式面试官。",
		"请对候选人的回答进行中文评分，重点看：正确性、完整性、条理性、项目结合度。",
		'请只输出一个 JSON 对象，不要输出 Markdown 代码块，不要输出额外解释。',
		'JSON 格式必须是：{"score": number, "verdict": string, "summary": string, "strengths": string[], "improvements": string[], "betterAnswer": string, "followUps": string[]}',
		"评分标准：",
		"- 90-100：回答正确、完整，且能结合项目经验",
		"- 75-89：核心方向正确，但细节或结构还能加强",
		"- 60-74：有部分正确点，但遗漏较多或表达比较散",
		"- 0-59：明显偏题、错误较多或内容过少",
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
		sendJson(res, 200, parsed);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "服务器处理失败。";
		sendJson(res, 500, { error: message });
	}
}
