import type { SakuraConfig } from "../types/config";

export const sakuraConfig: SakuraConfig = {
	enable: true,
	switchable: true,
	sakuraNum: 21,
	limitTimes: -1,
	size: {
		min: 0.5, // 樱花最小尺寸倍数
		max: 1.1,
	},
	opacity: {
		min: 0.3, // 樱花最小不透明度
		max: 0.9,
	},
	speed: {
		horizontal: {
			min: -1.2, // 水平移动速度最小值
			max: -0.8,
		},
		vertical: {
			min: 0.9, // 垂直移动速度最小值
			max: 1.4,
		},
		rotation: 0.02, // 旋转速度
		fadeSpeed: 0.03,
	},
	zIndex: 100,
};
