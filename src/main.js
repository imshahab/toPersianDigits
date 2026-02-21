const DIGIT_MAP = {
	0: '۰',
	1: '۱',
	2: '۲',
	3: '۳',
	4: '۴',
	5: '۵',
	6: '۶',
	7: '۷',
	8: '۸',
	9: '۹',
};

function toPersianDigits(text) {
	return text.replace(/[0-9]/g, (digit) => DIGIT_MAP[digit]);
}

function collectTextNodes(nodes) {
	const textNodes = [];
	const stack = [...nodes];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) {
			continue;
		}

		if (current.type === 'TEXT') {
			textNodes.push(current);
		}

		if ('children' in current) {
			for (const child of current.children) {
				stack.push(child);
			}
		}
	}

	return textNodes;
}

async function loadAllFontsForTextNode(textNode) {
	if (textNode.characters.length === 0) {
		return;
	}

	const fontName = textNode.fontName;

	if (fontName === figma.mixed) {
		const segments = textNode.getStyledTextSegments(['fontName']);
		const seen = new Set();

		for (const segment of segments) {
			const key = `${segment.fontName.family}:::${segment.fontName.style}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			await figma.loadFontAsync(segment.fontName);
		}
		return;
	}

	await figma.loadFontAsync(fontName);
}

async function run() {
	const selection = figma.currentPage.selection;

	if (selection.length === 0) {
		figma.notify('Select at least one layer that contains text.');
		figma.closePlugin();
		return;
	}

	const textNodes = collectTextNodes(selection);
	if (textNodes.length === 0) {
		figma.notify('No text layers found in the current selection.');
		figma.closePlugin();
		return;
	}

	let convertedCount = 0;
	let unchangedCount = 0;
	let skippedCount = 0;

	for (const textNode of textNodes) {
		const originalText = textNode.characters;
		const convertedText = toPersianDigits(originalText);

		if (originalText === convertedText) {
			unchangedCount += 1;
			continue;
		}

		try {
			await loadAllFontsForTextNode(textNode);
			textNode.characters = convertedText;
			convertedCount += 1;
		} catch (_error) {
			skippedCount += 1;
		}
	}

	const message =
		skippedCount > 0
			? `Converted ${convertedCount} text layer(s). Skipped ${skippedCount} layer(s).`
			: `Converted ${convertedCount} text layer(s).`;

	figma.notify(message);
	figma.closePlugin(
		`Done. Converted: ${convertedCount}, unchanged: ${unchangedCount}, skipped: ${skippedCount}.`,
	);
}

run();
