import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import imageGridLinks from "../src/integrations/image-grid-links.mjs";
import { syncImageGridLinks } from "../src/utils/image-grid-links.js";

const grid = `<div class="image-grid"><a class="image-grid__link" href="diagram.webp" data-fancybox="grid-1"><img src="/_astro/diagram.hash.webp" alt="Diagram"></a></div>`;

describe("Rendered image grid links", () => {
	it("uses Astro's final image URL and preserves gallery attributes", () => {
		const root = parse(grid);
		assert.equal(syncImageGridLinks(root), true);
		const link = root.querySelector("a");
		assert.equal(link.getAttribute("href"), "/_astro/diagram.hash.webp");
		assert.equal(link.getAttribute("data-fancybox"), "grid-1");
		assert.equal(link.querySelector("img").getAttribute("alt"), "Diagram");
		assert.equal(syncImageGridLinks(root), false);
	});

	it("preserves unrelated links and ignores grids without an image URL", () => {
		const html = `<a href="https://example.com"><img src="/logo.webp"></a><a class="image-grid__link" href="/original.webp"><img></a>`;
		const root = parse(html);
		assert.equal(syncImageGridLinks(root), false);
		assert.equal(root.toString(), html);
	});

	it("handles remote image URLs and development image query parameters", () => {
		for (const src of [
			"https://cdn.example.com/photo.webp",
			"/_image?href=diagram.png&w=1200&f=webp",
		]) {
			const root = parse(
				`<a class="image-grid__link" href="old.webp"><img src="${src.replaceAll("&", "&amp;")}"></a>`,
			);
			syncImageGridLinks(root);
			assert.equal(root.querySelector("a").getAttribute("href"), src);
		}
	});

	it("rewrites generated nested pages without requiring browser JavaScript", async () => {
		const directory = await mkdtemp(join(tmpdir(), "image-grid-links-"));
		try {
			await mkdir(join(directory, "posts", "sample"), { recursive: true });
			const page = join(directory, "posts", "sample", "index.html");
			await writeFile(page, `<!doctype html><html><body>${grid}</body></html>`);
			await imageGridLinks().hooks["astro:build:generated"]({
				dir: pathToFileURL(`${directory}/`),
				logger: { info() {} },
			});
			const root = parse(await readFile(page, "utf8"));
			assert.equal(
				root.querySelector("a").getAttribute("href"),
				root.querySelector("img").getAttribute("src"),
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
