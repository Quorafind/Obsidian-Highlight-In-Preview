import { Plugin } from 'obsidian';

interface highlighter {
	class: string,
	color: string,
	query: string,
	regex: boolean,
}

export default class HighlightInPreviewPlugin extends Plugin {
	highlighters: highlighter[] = [];

	async onload() {
		// 获取外部插件


		this.registerMarkdownPostProcessor((element: HTMLElement, context: any) => {
			// @ts-ignore
			const dynamicHighlightsPlugin = this.app.plugins.getPlugin("obsidian-dynamic-highlights");



			// 如果外部插件存在，读取其设置并保存到高亮规则数组中
			if(dynamicHighlightsPlugin && dynamicHighlightsPlugin.staticHighlighter[1].value.queries) {
				this.highlighters = Object.values(dynamicHighlightsPlugin.staticHighlighter[1].value.queries);
				this.highlighters = this.highlighters.filter((highlighter)=>{
					return !highlighter.class?.includes("light-time");
				})
				this.highlighters.push({
					class: "light-time",
					color: "#E45858",
					query: "\\b(\\d{1,2}:\\d{1,2}(:\\d{2})?)\\b",
					regex: true,
				});
			} else {
				// 如果外部插件不存在，或者它的相关属性没有被正确初始化，使用默认设置
				this.highlighters.push({
					class: "light-time",
					color: "#E45858",
					query: "\\b(\\d{1,2}:\\d{1,2}(:\\d{2})?)\\b",
					regex: true,
				});
			}

			// Create a TreeWalker to traverse text nodes
			const walker = document.createTreeWalker(
				element,
				NodeFilter.SHOW_TEXT
			);

			let node;
			let nodesToProcess = [];
			while (node = walker.nextNode()) {
				const text = node.textContent?.trim();

				if(!text) continue;

				// 根据高亮规则数组来检测文本节点
				for(const highlighter of this.highlighters) {
					if(highlighter.regex) {
						const hasHighlight = new RegExp(highlighter.query).test(text);
						if (hasHighlight) {
							nodesToProcess.push({node: node, highlighter: highlighter});
							break;
						}
					}
				}
			}

			for (let item of nodesToProcess) {
				this.replaceTextInNode(item.node, item.highlighter);
			}
		});
	}

	replaceTextInNode(node: Node, highlighter: any) {
		if (node.nodeType === Node.TEXT_NODE) {
			const textContent = node.textContent || "";
			const regex = new RegExp(highlighter.query, 'g');
			let match;
			let lastIndex = 0;
			console.log(highlighter.query);
			while ((match = regex.exec(textContent)) !== null) {
				const part = match[0];
				// append the text before this match
				const precedingText = textContent.substring(lastIndex, match.index);
				if (precedingText !== "") {
					node.parentNode?.insertBefore(document.createTextNode(precedingText), node);
				}
				lastIndex = regex.lastIndex;

				// append the new node for this match
				let classes = highlighter.class;
				if (classes.includes('light-time') && /\d{1,2}:\d{2}(:\d{2})?/.test(part)) {
					const timeParts = part.split(':');
					const hour = parseInt(timeParts[0]) > 12 ? parseInt(timeParts[0]) - 12 : parseInt(timeParts[0]);
					const minute = parseInt(timeParts[1]);
					if (minute >= 30) {
						classes += ` light-time-${hour}-5`;
					} else {
						classes += ` light-time-${hour}`;
					}
				}

				const span = document.createElement('span');
				span.className = classes;
				span.style.backgroundColor = highlighter.color;
				span.textContent = part;
				node.parentNode?.insertBefore(span, node);
			}
			// append the text after the last match
			const remainingText = textContent.substring(lastIndex);
			if (remainingText !== "") {
				node.parentNode?.insertBefore(document.createTextNode(remainingText), node);
			}
			node.parentNode?.removeChild(node);
		}
	}
}
