declare const process: {
	env: Record<string, string | undefined>;
};

const UMAMI_API_BASE = "https://api.umami.is/v1";
const API_KEY = process.env.UMAMI_API_KEY;
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
};

function sendJson(res: any, status: number, body: Record<string, unknown>) {
	Object.entries(corsHeaders).forEach(([key, value]) => {
		res.setHeader(key, value);
	});
	res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
	res.status(status).json(body);
}

function normalizeStats(data: any) {
	return {
		pageviews: Number(data?.pageviews || 0),
		visitors: Number(data?.visitors || 0),
		visits: Number(data?.visits || 0),
	};
}

export default async function handler(req: any, res: any) {
	if (req.method === "OPTIONS") {
		Object.entries(corsHeaders).forEach(([key, value]) => {
			res.setHeader(key, value);
		});
		res.status(204).end();
		return;
	}

	if (req.method !== "GET") {
		sendJson(res, 405, { error: "Only GET is supported." });
		return;
	}

	if (!API_KEY || !WEBSITE_ID) {
		sendJson(res, 500, {
			error: "Vercel 环境变量 UMAMI_API_KEY 或 UMAMI_WEBSITE_ID 未配置。",
		});
		return;
	}

	try {
		const rawPath =
			typeof req.query?.path === "string" ? req.query.path.trim() : "";
		const params = new URLSearchParams({
			startAt: "0",
			endAt: Date.now().toString(),
		});

		if (rawPath) {
			params.set("path", `eq.${rawPath}`);
		}

		const response = await fetch(
			`${UMAMI_API_BASE}/websites/${WEBSITE_ID}/stats?${params.toString()}`,
			{
				headers: {
					"x-umami-api-key": API_KEY,
				},
			},
		);

		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			sendJson(res, response.status, {
				error: data?.error?.message || data?.message || "Umami 统计获取失败。",
			});
			return;
		}

		sendJson(res, 200, normalizeStats(data));
	} catch (error) {
		sendJson(res, 500, {
			error: error instanceof Error ? error.message : "Umami 统计获取失败。",
		});
	}
}
