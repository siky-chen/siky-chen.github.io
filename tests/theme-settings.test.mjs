import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { describe, it } from "node:test";
import vm from "node:vm";

const settingsSource = await readFile(
	new URL("../src/utils/setting-utils.ts", import.meta.url),
	"utf8",
);
const headSource = await readFile(
	new URL("../src/layouts/partials/HeadTags.astro", import.meta.url),
	"utf8",
);
const hueFunctions = stripTypeScriptTypes(
	settingsSource
		.slice(
			settingsSource.indexOf("export function getDefaultHue"),
			settingsSource.indexOf("export function applyThemeToDocument"),
		)
		.replaceAll("export function", "function"),
);
const prePaintHue = headSource
	.split("// Load the hue from local storage")[1]
	.split("// calculate the --banner-height-extend")[0];

function createContext(stored, fixed = false) {
	const values = new Map(stored === null ? [] : [["hue", stored]]);
	const properties = new Map();
	return {
		values,
		properties,
		context: vm.createContext({
			siteConfig: { themeColor: { hue: 260, fixed } },
			configHue: 260,
			themeColorFixed: fixed,
			localStorage: {
				getItem: (key) => values.get(key) ?? null,
				setItem: (key, value) => values.set(key, value),
			},
			document: {
				documentElement: {
					style: { setProperty: (key, value) => properties.set(key, value) },
				},
				querySelector: () => ({
					style: { setProperty: (key, value) => properties.set(key, value) },
				}),
			},
		}),
	};
}

describe("Theme hue preferences", () => {
	for (const [stored, expected] of [
		[null, 260],
		["0", 0],
		["360", 360],
		["60", 60],
		["NaN", 260],
		["undefined", 260],
		["Infinity", 260],
		["", 260],
		[" ", 260],
		["-5", 260],
		["365", 260],
		["60oops", 260],
	]) {
		it(`restores ${JSON.stringify(stored)} consistently before paint and in settings`, () => {
			const { context, properties } = createContext(stored);
			vm.runInContext(hueFunctions, context);
			assert.equal(vm.runInContext("getHue()", context), expected);
			vm.runInContext(prePaintHue, context);
			assert.equal(properties.get("--hue"), String(expected));
		});
	}

	it("applies and persists changes, including zero and reset", () => {
		const { context, properties, values } = createContext(null);
		vm.runInContext(hueFunctions, context);
		for (const hue of [60, 0, 360, 260]) {
			vm.runInContext(`setHue(${hue})`, context);
			assert.equal(properties.get("--hue"), String(hue));
			assert.equal(values.get("hue"), String(hue));
			assert.equal(vm.runInContext("getHue()", context), hue);
		}
	});

	it("uses the configured default when a write is invalid or color is fixed", () => {
		for (const fixed of [false, true]) {
			const { context, properties } = createContext("60", fixed);
			vm.runInContext(hueFunctions, context);
			vm.runInContext("setHue(NaN)", context);
			assert.equal(properties.get("--hue"), "260");
			if (fixed) {
				vm.runInContext("setHue(60)", context);
				assert.equal(properties.get("--hue"), "260");
				vm.runInContext(prePaintHue, context);
				assert.equal(properties.get("--hue"), "260");
			}
		}
	});
});
