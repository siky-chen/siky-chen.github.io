// Shared category/tag filters, including pages replaced by Swup.
(() => {
	if (window.__initFilterTabs) {
		window.__initFilterTabs();
		return;
	}

	const initialized = new WeakSet();

	function applyFilter(container, tab) {
		const attribute = tab.dataset.filterAttr;
		if (!attribute) return;

		const value = tab.dataset.filterValue || "all";
		const parent = container.closest(".card-base") || document;
		let visibleCount = 0;

		container.querySelectorAll(".filter-tabs-item").forEach((item) => {
			item.classList.toggle("active", item === tab);
		});
		parent.querySelectorAll(`[data-${attribute}]`).forEach((item) => {
			const values = (item.getAttribute(`data-${attribute}`) || "")
				.split(",")
				.map((entry) => entry.trim());
			const matches = value === "all" || values.includes(value);
			item.classList.toggle("filtered-out", !matches);
			item.hidden = !matches;
			if (matches) visibleCount++;
		});
		parent
			.querySelector("#no-results")
			?.classList.toggle("hidden", visibleCount > 0);
	}

	function initFilterTabs() {
		document.querySelectorAll(".filter-tabs").forEach((container) => {
			if (!initialized.has(container)) {
				container.addEventListener("click", (event) => {
					if (!(event.target instanceof Element)) return;
					const tab = event.target.closest(".filter-tabs-item");
					if (tab && tab.closest(".filter-tabs") === container) {
						applyFilter(container, tab);
					}
				});
				initialized.add(container);
			}
			const active =
				container.querySelector(".filter-tabs-item.active") ||
				container.querySelector(".filter-tabs-item");
			if (active) applyFilter(container, active);
		});
	}

	window.__initFilterTabs = initFilterTabs;
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initFilterTabs, { once: true });
	} else {
		initFilterTabs();
	}
	document.addEventListener("astro:page-load", initFilterTabs);
	document.addEventListener("swup:page:view", initFilterTabs);
})();
