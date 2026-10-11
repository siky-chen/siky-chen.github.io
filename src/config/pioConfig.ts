import type { PioConfig } from "../types/config";

// Pio 看板娘配置
export const pioConfig: PioConfig = {
	enable: true, // 启用看板娘
	models: ["/pio/models/umaru/model.json", "/pio/models/pio/model.json"], // 默认模型路径
	position: "left", // 模型位置
	width: Math.round(280 * 0.7), // 默认宽度
	height: Math.round(250 * 0.7), // 默认高度
	mode: "draggable", // 默认为可拖拽模式
	hiddenOnMobile: true, // 默认在移动设备上隐藏
	hideAboutMenu: false, // 隐藏内置 About 菜单按钮
	dialog: {
		welcome: "欢迎来到我的主人Siky的blog!", // 欢迎词
		touch: ["你在干什么？", "不要碰我！", "HENTAI！", "不要这样欺负我！"], // 触摸提示
		home: "点击这里就可以返回主页啦!", // 首页提示
		skin: ["变身!", "这套新衣服真好看~"], // 换装提示
		close: "QWQ 要下次再见了吗~", // 关闭提示
		link: "https://github.com/matsuzaka-yuki/Mizuki",
	},
};
