import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicAssets = resolve(projectRoot, "public", "assets");
const mirroredAssets = resolve(
	projectRoot,
	"src",
	"assets",
	"public",
	"assets",
);
const musicCoverOutput = resolve(
	projectRoot,
	"src",
	"assets",
	"music",
	"cover",
);

// 新版组件会优先请求 WebP；从本站保留的 PNG 源文件生成对应资源。
for (const relative of ["sakura", "assets/home/default-logo", "assets/home/home"]) {
	await sharp(resolve(projectRoot, "public", `${relative}.png`))
		.webp({ lossless: true })
		.toFile(resolve(projectRoot, "public", `${relative}.webp`));
}

for (const directory of ["desktop-banner", "mobile-banner"]) {
	const targetDirectory = resolve(mirroredAssets, directory);
	await mkdir(targetDirectory, { recursive: true });
	const sourceDirectory = resolve(publicAssets, directory);
	for (const name of await readdir(sourceDirectory)) {
		if (!name.endsWith(".webp")) continue;
		await cp(
			resolve(sourceDirectory, name),
			resolve(targetDirectory, name),
		);
	}
}

await mkdir(musicCoverOutput, { recursive: true });
const musicCoverSource = resolve(publicAssets, "music", "cover");
const availableMusicCovers = await readdir(musicCoverSource);
for (const name of ["cl", "dazbee", "hitori", "xryx"]) {
	const sourceName = availableMusicCovers.find((file) =>
		new RegExp(`^${name}\\.(webp|jpg|jpeg|png)$`).test(file),
	);
	// 没有可编辑源文件时，保留已经提交的播放器封面。
	if (!sourceName) continue;
	const source = resolve(musicCoverSource, sourceName);
	const target = resolve(musicCoverOutput, `${name}.webp`);
	const metadata = await sharp(source).metadata();

	if (
		metadata.format === "webp" &&
		(metadata.width ?? 0) <= 192 &&
		(metadata.height ?? 0) <= 192
	) {
		await cp(source, target);
	} else {
		await sharp(source)
			.resize(192, 192, { fit: "cover", position: "centre" })
			.webp({ quality: 85 })
			.toFile(target);
	}
}

console.log("Prepared mirrored banners and player-sized music covers.");
