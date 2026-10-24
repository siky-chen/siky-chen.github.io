/** @param {HTMLElement} heading */
export function getHeadingTop(heading) {
	return heading.getBoundingClientRect().top + window.scrollY;
}

/**
 * @param {string} id
 * @param {{ offset?: number, behavior?: ScrollBehavior }} [options]
 */
export function scrollToHeading(id, options = {}) {
	const { offset = 80, behavior = "smooth" } = options;
	const heading = document.getElementById(id);
	if (heading) {
		window.scrollTo({ top: getHeadingTop(heading) - offset, behavior });
	}
}
