// Skill data configuration file
// Used to manage data for the skill display page

export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "mcu" | "soc" | "tools" | "robotics" | "vision";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	projects?: string[]; // Related project IDs
	certifications?: string[];
	color?: string; // Skill card theme color
}

export const skillsData: Skill[] = [
	{
		id: "zephyr",
		name: "Zephyr",
		description: "Zephyr RTOS development and configuration for embedded systems.",
		icon: "mdi:chip",
		category: "mcu",
		level: "intermediate",
		experience: { years: 1, months: 2 },
		color: "#2E6AE6",
	},
	{
		id: "c",
		name: "C",
		description: "Low-level programming for embedded systems and performance-critical code.",
		icon: "mdi:language-c",
		category: "mcu",
		level: "advanced",
		experience: { years: 4, months: 3 },
		color: "#5C6BC0",
	},
	{
		id: "cpp",
		name: "C++",
		description: "Modern C++ development including STL and embedded use cases.",
		icon: "mdi:language-cpp",
		category: "soc",
		level: "advanced",
		experience: { years: 2, months: 0 },
		color: "#0288D1",
	},
	{
		id: "docker",
		name: "Docker",
		description: "Containerizing services and building reproducible dev environments.",
		icon: "mdi:docker",
		category: "tools",
		level: "intermediate",
		experience: { years: 1, months: 1 },
		color: "#2496ED",
	},
	{
		id: "git",
		name: "Git",
		description: "Version control workflows, branching strategies, and collaboration.",
		icon: "mdi:git",
		category: "tools",
		level: "intermediate",
		experience: { years: 3, months: 0 },
		color: "#F05032",
	},
	{
		id: "linux",
		name: "Linux",
		description: "Linux system usage, shell, and troubleshooting.",
		icon: "mdi:linux",
		category: "soc",
		level: "advanced",
		experience: { years: 3, months: 0 },
		color: "#FCC624",
	},
	{
		id: "ros2",
		name: "ROS 2",
		description: "Robotics middleware development with ROS 2 nodes and tooling.",
		icon: "mdi:robot-industrial",
		category: "robotics",
		level: "intermediate",
		experience: { years: 1, months: 2 },
		color: "#22314E",
	},
	{
		id: "yolo",
		name: "YOLO",
		description: "Real-time object detection using the YOLO series models.",
		icon: "mdi:camera-outline",
		category: "vision",
		level: "intermediate",
		experience: { years: 1, months: 0 },
		color: "#E91E63",
	},
];

export const getSkillsByCategory = (category?: Skill["category"]) => {
	if (!category) return skillsData;
	return skillsData.filter((skill) => skill.category === category);
};

export const getAdvancedSkills = () =>
	skillsData.filter(
		(skill) => skill.level === "advanced" || skill.level === "expert",
	);

export const getTotalExperience = () => {
	const totalMonths = skillsData.reduce((sum, skill) => {
		return sum + skill.experience.years * 12 + skill.experience.months;
	}, 0);
	return {
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
	};
};

export const getSkillStats = () => {
	const stats = {
		total: skillsData.length,
		byLevel: {
			beginner: 0,
			intermediate: 0,
			advanced: 0,
			expert: 0,
		},
		byCategory: {
			mcu: 0,
			soc: 0,
			tools: 0,
			robotics: 0,
			vision: 0,
		},
	};

	for (const skill of skillsData) {
		stats.byLevel[skill.level] += 1;

		if (skill.category in stats.byCategory) {
			stats.byCategory[skill.category] += 1;
		}
	}

	return stats;
};
