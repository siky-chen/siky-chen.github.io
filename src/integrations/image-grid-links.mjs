import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { parse } from "node-html-parser";
import { syncImageGridLinks } from "../utils/image-grid-links.js";

export default function imageGridLinks() {
	return {
		name: "image-grid-links",
		hooks: {
			"astro:build:generated": async ({ dir, logger }) => {
				const pages = await glob("**/*.html", {
					cwd: fileURLToPath(dir),
					absolute: true,
				});
				let updated = 0;
				for (const page of pages) {
					const html = await readFile(page, "utf8");
					const root = parse(html);
					if (syncImageGridLinks(root)) {
						await writeFile(page, root.toString());
						updated++;
					}
				}
				logger.info(`Updated image-grid links in ${updated} page(s).`);
			},
		},
	};
}
