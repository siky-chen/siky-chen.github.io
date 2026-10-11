import { getImage } from "astro:assets";
// import { getCollection } from "astro:content";
import type { APIContext, ImageMetadata } from "astro";
import MarkdownIt from "markdown-it";
import { parse as htmlParser } from "node-html-parser";
import path from "node:path";
import sanitizeHtml from "sanitize-html";
import { profileConfig, siteConfig } from "@/config";
import { getSortedPosts } from "@/utils/content-utils";
import { getPostUrl } from "@/utils/url-utils";
import { initPostIdMap } from "@/utils/permalink-utils";

const markdownParser = new MarkdownIt();

// get dynamic import of images as a map collection
const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
	"/src/content/**/*.{jpeg,jpg,png,gif,webp}", // include posts and assets
);

function getPostContentDir(post: { id: string; filePath?: string }) {
	const filePath = post.filePath?.replace(/\\/g, "/");
	if (filePath?.startsWith("src/content/posts/")) {
		const relativePath = filePath.replace(/^src\/content\/posts\//, "");
		const dir = path.posix.dirname(relativePath);
		return dir === "." ? "" : dir;
	}

	return post.id.includes("/")
		? path.posix.dirname(post.id)
		: post.id;
}

function getImageImportCandidates(
	src: string,
	post: { id: string; filePath?: string },
) {
	const postDir = getPostContentDir(post);
	const normalizedSrc = src.startsWith("./") ? src.slice(2) : src;

	if (src.startsWith("../")) {
		const base = postDir ? `/src/content/posts/${postDir}` : "/src/content/posts";
		return [path.posix.normalize(`${base}/${src}`)];
	}

	const candidates: string[] = [];
	if (postDir) {
		candidates.push(`/src/content/posts/${postDir}/${normalizedSrc}`);
	}
	candidates.push(`/src/content/posts/${normalizedSrc}`);
	return candidates;
}

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	// Use the same ordering as site listing (pinned first, then by published desc)
	// 过滤掉加密文章和草稿文章
	const posts = (await getSortedPosts()).filter(
		(post) => !post.data.encrypted && post.data.draft !== true,
	);

	// 初始化文章 ID 映射（用于 permalink 功能）
	initPostIdMap(posts);

	// 创建Atom feed头部
	let atomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${siteConfig.title}</title>
  <subtitle>${siteConfig.subtitle || "No description"}</subtitle>
  <link href="${context.site}" rel="alternate" type="text/html"/>
  <link href="${new URL("atom.xml", context.site)}" rel="self" type="application/atom+xml"/>
  <id>${context.site}</id>
  <updated>${new Date().toISOString()}</updated>
  <language>${siteConfig.lang}</language>`;

	for (const post of posts) {
		// convert markdown to html string, ensure post.body is a string
		const body = markdownParser.render(String(post.body ?? ""));
		// convert html string to DOM-like structure
		const html = htmlParser.parse(body);
		// hold all img tags in variable images
		const images = html.querySelectorAll("img");

		for (const img of images) {
			const src = img.getAttribute("src");
			if (!src) continue;

			// Handle content-relative images and convert them to built _astro paths
			if (
				src.startsWith("./") ||
				src.startsWith("../") ||
				(!src.startsWith("http") && !src.startsWith("/"))
			) {
				const importCandidates = getImageImportCandidates(src, post);
				const matchedImportPath = importCandidates.find(
					(importPath) => imagesGlob[importPath],
				);
				const imageMod = matchedImportPath
					? await imagesGlob[matchedImportPath]?.()?.then(
							(res) => res.default,
						)
					: null;
				if (imageMod) {
					const optimizedImg = await getImage({ src: imageMod });
					img.setAttribute(
						"src",
						new URL(optimizedImg.src, context.site).href,
					);
				} else {
					console.log(
						`Failed to load image: ${importCandidates.join(", ")} for post: ${post.id}`,
					);
				}
			} else if (src.startsWith("/")) {
				// images starting with `/` are in public dir
				img.setAttribute("src", new URL(src, context.site).href);
			}
		}

		// 添加Atom条目
		const postUrl = new URL(getPostUrl(post), context.site).href;
		const content = sanitizeHtml(html.toString(), {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
		});

		atomFeed += `
  <entry>
    <title>${post.data.title}</title>
    <link href="${postUrl}" rel="alternate" type="text/html"/>
    <id>${postUrl}</id>
    <published>${post.data.published.toISOString()}</published>
    <updated>${post.data.updated?.toISOString() || post.data.published.toISOString()}</updated>
    <summary>${post.data.description || ""}</summary>
    <content type="html"><![CDATA[${content}]]></content>
    <author>
      <name>${profileConfig.name}</name>
    </author>`;

		// 添加分类标签
		if (post.data.category) {
			atomFeed += `
    <category term="${post.data.category}"></category>`;
		}

		atomFeed += `
  </entry>`;
	}

	// 关闭Atom feed
	atomFeed += `
</feed>`;

	return new Response(atomFeed, {
		headers: {
			"Content-Type": "application/atom+xml; charset=utf-8",
		},
	});
}
