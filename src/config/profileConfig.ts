import type { ProfileConfig } from "../types/config";

// 个人资料配置
export const profileConfig: ProfileConfig = {
	avatar: "assets/images/siky.webp", // 相对于 /src 目录。如果以 '/' 开头，则相对于 /public 目录
	name: "Siky",
	bio: "这个世界很大❤️",
	typewriter: {
		enable: true, // 启用个人简介打字机效果
		speed: 80,
	},
	links: [
		{
			name: "Bilibili",
			icon: "fa7-brands:bilibili",
			url: "https://space.bilibili.com/37511201",
		},
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/siky-chen",
		},
		{
			name: "Email",
			icon: "fa7-regular:envelope",
			url: "mailto:chensiqi0711@outlook.com",
		},
	],
};
