import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	scrollToHeading as scrollFromMobileTOC,
	updateActiveHeading,
} from "../src/components/features/toc/hooks/useMobileTOC.ts";
import {
	getHeadingTop,
	scrollToHeading,
} from "../src/components/features/toc/hooks/useTocNavigation.ts";

function withDocument(scrollY, run) {
	const originalDocument = globalThis.document;
	const originalWindow = globalThis.window;
	const calls = [];
	const headings = [
		{ id: "intro", top: 800, tagName: "H2" },
		{ id: "nested-section", top: 4500, tagName: "H3" },
		{ id: "deep-heading", top: 18500, tagName: "H4" },
	].map(({ top, ...heading }) => ({
		...heading,
		// Deliberately relative to a positioned ancestor, not the document.
		offsetTop: 24,
		getBoundingClientRect: () => ({ top: top - scrollY }),
	}));
	globalThis.document = {
		getElementById: (id) =>
			headings.find((heading) => heading.id === id) ?? null,
		querySelectorAll: () => headings,
	};
	globalThis.window = { scrollY, scrollTo: (options) => calls.push(options) };
	try {
		run({ calls, headings });
	} finally {
		if (originalDocument === undefined) delete globalThis.document;
		else globalThis.document = originalDocument;
		if (originalWindow === undefined) delete globalThis.window;
		else globalThis.window = originalWindow;
	}
}

describe("TOC document coordinates", () => {
	for (const scrollY of [0, 4200, 12000]) {
		it(`jumps to a deeply nested heading from scrollY=${scrollY}`, () => {
			withDocument(scrollY, ({ calls, headings }) => {
				assert.equal(getHeadingTop(headings[2]), 18500);
				scrollFromMobileTOC("deep-heading");
				scrollToHeading("deep-heading");
				assert.deepEqual(calls, [
					{ top: 18420, behavior: "smooth" },
					{ top: 18420, behavior: "smooth" },
				]);
			});
		});
	}

	it("honors custom offsets and scroll behavior", () => {
		withDocument(6000, ({ calls }) => {
			scrollFromMobileTOC("deep-heading", 120);
			scrollToHeading("deep-heading", { offset: 144, behavior: "instant" });
			assert.deepEqual(calls, [
				{ top: 18380, behavior: "smooth" },
				{ top: 18356, behavior: "instant" },
			]);
		});
	});

	it("does not scroll when the heading is absent", () => {
		withDocument(6000, ({ calls }) => {
			scrollFromMobileTOC("missing");
			scrollToHeading("missing");
			assert.deepEqual(calls, []);
		});
	});

	it("highlights the current section using document coordinates", () => {
		withDocument(5000, () => {
			assert.equal(updateActiveHeading(), "nested-section");
		});
		withDocument(0, () => {
			assert.equal(updateActiveHeading(), "");
		});
	});
});
