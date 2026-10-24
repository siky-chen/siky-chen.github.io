/**
 * Use the rendered image URL after Astro has resolved local image assets.
 * @param {ParentNode | import("node-html-parser").HTMLElement} root
 */
export function syncImageGridLinks(root) {
	let changed = false;
	for (const link of root.querySelectorAll("a.image-grid__link")) {
		const src = link.querySelector("img[src]")?.getAttribute("src");
		if (src && link.getAttribute("href") !== src) {
			link.setAttribute("href", src);
			changed = true;
		}
	}
	return changed;
}
