/**
 * plugin.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*jshint smarttabs:true, undef:true, unused:true, latedef:true, curly:true, bitwise:true */
/*eslint no-labels:0, no-constant-condition: 0 */
/*global tinymce:true */

(function() {
	// Based on work developed by: James Padolsey http://james.padolsey.com
	// released under UNLICENSE that is compatible with LGPL
	// TODO: Handle contentEditable edgecase:
	// <p>text<span contentEditable="false">text<span contentEditable="true">text</span>text</span>text</p>
	function findAndReplaceDOMText(regex, node, replacementNode, captureGroup, schema) {
		var m, matches = [], text, count = 0, doc;
		var blockElementsMap, hiddenTextElementsMap, shortEndedElementsMap;

		doc = node.ownerDocument;
		blockElementsMap = schema.getBlockElements(); // H1-H6, P, TD etc
		hiddenTextElementsMap = schema.getWhiteSpaceElements(); // TEXTAREA, PRE, STYLE, SCRIPT
		shortEndedElementsMap = schema.getShortEndedElements(); // BR, IMG, INPUT

		function getMatchIndexes(m, captureGroup) {//使用正则表达式的方式匹配纯文本，返回【start pos，end pos，string】
			captureGroup = captureGroup || 0;

			if (!m[0]) {
				throw 'findAndReplaceDOMText cannot handle zero-length matches';
			}

			var index = m.index;

			if (captureGroup > 0) {
				var cg = m[captureGroup];

				if (!cg) {
					throw 'Invalid capture group';
				}

				index += m[0].indexOf(cg);
				m[0] = cg;
			}

			return [index, index + m[0].length, [m[0]]];
		}

		function getText(node) {
			var txt;

			if (node.nodeType === 3) { //到了最后一层的文本层了
				return node.data;
			}

			if (hiddenTextElementsMap[node.nodeName] && !blockElementsMap[node.nodeName]) { //隐藏非块级元素，空格代替
				return '';
			}

			txt = '';

			if (blockElementsMap[node.nodeName] || shortEndedElementsMap[node.nodeName]) { //块级元素、短end元素，回车代替
				txt += '\n';
			}

			if ((node = node.firstChild)) {
				do {
					txt += getText(node);  //递归的方式进行获取纯文本
				} while ((node = node.nextSibling));
			}

			return txt;
		}

		function stepThroughMatches(node, matches, replaceFn) {
			var startNode, endNode, startNodeIndex,
				endNodeIndex, innerNodes = [], atIndex = 0, curNode = node,
				matchLocation = matches.shift(), matchIndex = 0;

			out: while (true) {  //这一步其实是递归操作，改成的循环。他会遍历dom中的每个元素
				if (blockElementsMap[curNode.nodeName] || shortEndedElementsMap[curNode.nodeName]) { //这里需要跟前文的纯文本匹配结合起来
					atIndex++;
				}

				if (curNode.nodeType === 3) {
					if (!endNode && curNode.length + atIndex >= matchLocation[1]) {
						// We've found the ending
						endNode = curNode;
						endNodeIndex = matchLocation[1] - atIndex;
					} else if (startNode) {   //把匹配过程中，涉及到的元素，入栈。用于加灰底标记
						// Intersecting node
						innerNodes.push(curNode);
					}

					if (!startNode && curNode.length + atIndex > matchLocation[0]) { //匹配的文字是从curNode中间（开始）的位置开始匹配到的。
						// We've found the match start
						startNode = curNode;
						startNodeIndex = matchLocation[0] - atIndex; //存储了一个偏移量。匹配点开始处距离curNode开始处的偏移。
					}
        //注意上文两处用了>= 原因：curNode.length一般是>1的，而匹配的文字通常也是从中间开始匹配的。这一块的匹配是基于索引的匹配，而且是按照curNode.length进行扫描的。
					atIndex += curNode.length;
				}

				if (startNode && endNode) {  //匹配到了
					curNode = replaceFn({
						startNode: startNode,
						startNodeIndex: startNodeIndex,
						endNode: endNode,
						endNodeIndex: endNodeIndex,
						innerNodes: innerNodes,
						match: matchLocation[2],
						matchIndex: matchIndex  //到当前为止，遍历过的元素个数
					});  //加灰底操作

					// replaceFn has to return the node that replaced the endNode
					// and then we step back so we can continue from the end of the
					// match:
					atIndex -= (endNode.length - endNodeIndex);
					startNode = null;
					endNode = null;
					innerNodes = [];
					matchLocation = matches.shift(); //开始填装下一个匹配信息
					matchIndex++;

					if (!matchLocation) {
						break; // no more matches
					}
				} else if ((!hiddenTextElementsMap[curNode.nodeName] || blockElementsMap[curNode.nodeName]) && curNode.firstChild) {
					// Move down  找儿子节点
					curNode = curNode.firstChild;
					continue;
				} else if (curNode.nextSibling) {
					// Move forward:  找下一个姊妹节点
					curNode = curNode.nextSibling;
					continue;
				}

				// Move forward or up:  既没有儿子，也没有姊妹节点，往上找。
				while (true) {
					if (curNode.nextSibling) {
						curNode = curNode.nextSibling;
						break;
					} else if (curNode.parentNode !== node) {
						curNode = curNode.parentNode;
					} else {
						break out;  //出大循环。整个editor文档遍历完毕。
					}
				}
			}
		}

		/**
		* Generates the actual replaceFn which splits up text nodes
		* and inserts the replacement element.
		*/
		function genReplacer(nodeName) {
			var makeReplacementNode;

			if (typeof nodeName != 'function') {
				var stencilNode = nodeName.nodeType ? nodeName : doc.createElement(nodeName);

				makeReplacementNode = function(fill, matchIndex) {
					var clone = stencilNode.cloneNode(false);

					clone.setAttribute('data-mce-index', matchIndex); //标记索引，被moveSelection() getElmIndex调用 ，便于查找。

					if (fill) {
						clone.appendChild(doc.createTextNode(fill));
					}

					return clone;
				};
			} else {
				makeReplacementNode = nodeName;
			}

			return function(range) {
				var before, after, parentNode, startNode = range.startNode,
					endNode = range.endNode, matchIndex = range.matchIndex;

				if (startNode === endNode) {  //不跨节点 把整个节点考虑成3部分，只有中间的那部分是需要加灰底的
					var node = startNode;

					parentNode = node.parentNode;
					if (range.startNodeIndex > 0) {
						// Add `before` text node (before the match)
						before = doc.createTextNode(node.data.substring(0, range.startNodeIndex));
						parentNode.insertBefore(before, node);
					}

					// Create the replacement node:
					var el = makeReplacementNode(range.match[0], matchIndex);
					parentNode.insertBefore(el, node);
					if (range.endNodeIndex < node.length) {
						// Add `after` text node (after the match)
						after = doc.createTextNode(node.data.substring(range.endNodeIndex));
						parentNode.insertBefore(after, node);
					}

					node.parentNode.removeChild(node);

					return el;
				}
        //跨多个节点。startNode和endNode都是分割成两部分考虑，而中间的就直接加灰底。
				// Replace startNode -> [innerNodes...] -> endNode (in that order)
				before = doc.createTextNode(startNode.data.substring(0, range.startNodeIndex));
				after = doc.createTextNode(endNode.data.substring(range.endNodeIndex));
				var elA = makeReplacementNode(startNode.data.substring(range.startNodeIndex), matchIndex);
				var innerEls = [];

				for (var i = 0, l = range.innerNodes.length; i < l; ++i) {
					var innerNode = range.innerNodes[i];
					var innerEl = makeReplacementNode(innerNode.data, matchIndex);
					innerNode.parentNode.replaceChild(innerEl, innerNode);
					innerEls.push(innerEl);
				}

				var elB = makeReplacementNode(endNode.data.substring(0, range.endNodeIndex), matchIndex);

				parentNode = startNode.parentNode;
				parentNode.insertBefore(before, startNode);
				parentNode.insertBefore(elA, startNode);
				parentNode.removeChild(startNode);

				parentNode = endNode.parentNode;
				parentNode.insertBefore(elB, endNode);
				parentNode.insertBefore(after, endNode);
				parentNode.removeChild(endNode);

				return elB;
			};
		}

		text = getText(node); //获取文档的纯文本
		if (!text) {
			return;
		}
    //对纯文本进行匹配
		if (regex.global) {
			while ((m = regex.exec(text))) {
				matches.push(getMatchIndexes(m, captureGroup));
			}
		} else {
			m = text.match(regex);
			matches.push(getMatchIndexes(m, captureGroup));
		}
    //对dom进行匹配，并加灰底
		if (matches.length) {
			count = matches.length;
			stepThroughMatches(node, matches, genReplacer(replacementNode)); //genReplacer(replacementNode)回调函数，用于找到匹配后，对匹配部分进行加灰底操作。
		}

		return count;
	}

	function Plugin(editor) {
		var self = this, currentIndex = -1;

		function showDialog() {
			var last = {}, selectedText;

			selectedText = tinymce.trim(editor.selection.getContent({format: 'text'})); //获取选择的文本，用于直接显示在对话框中

			function updateButtonStates() {  //更新下一个和上一个 按钮的状态
				win.statusbar.find('#next').disabled(!findSpansByIndex(currentIndex + 1).length);
				win.statusbar.find('#prev').disabled(!findSpansByIndex(currentIndex - 1).length);
			}

			function notFoundAlert() {
				tinymce.ui.MessageBox.alert('Could not find the specified string.', function() {
					win.find('#find')[0].focus();
				});
			}
    //关于窗口创建部分，以后不要使用这种方式进行创建。推荐使用： https://www.tiny.cloud/docs/ui-components/。 关于参数部分的设置，有空再写。
			var win = tinymce.ui.Factory.create({
				type: 'window',
				layout: "flex",
				pack: "center",
				align: "center",
				onClose: function() {
					editor.focus();
					self.done();
				},
				onSubmit: function(e) {
					var count, caseState, text, wholeWord;

					e.preventDefault();

					caseState = win.find('#case').checked();
					wholeWord = win.find('#words').checked();

					text = win.find('#find').value();
					if (!text.length) {  //未填文本就进行查找，直接返回了。
						self.done(false);
						win.statusbar.items().slice(1).disabled(true);
						return;
					}

					if (last.text == text && last.caseState == caseState && last.wholeWord == wholeWord) {  //可以找到查找的文字，第二次点击查找，会进入此判断
						if (findSpansByIndex(currentIndex + 1).length === 0) {  //currentIndex起始为-1，由moveSelection()进行赋值
							notFoundAlert();
							return;
						}

						self.next();  //高亮下一个找的
						updateButtonStates();
						return;
					}
          //已填充查找的文字，第一次点击查找，会进入下文
					count = self.find(text, caseState, wholeWord);//查找，并在主文档中加灰底标记，并高亮第一个找到的
					if (!count) {
						notFoundAlert();
					}

					win.statusbar.items().slice(1).disabled(count === 0);
					updateButtonStates();

					last = {
						text: text,
						caseState: caseState,
						wholeWord: wholeWord
					};
				},
				buttons: [  //这一部分是放到了win.statusbar中了，调用
					{text: "Find", subtype: 'primary', onclick: function() {  //查找按钮 触发onSubmit
						win.submit();
					}},
					{text: "Replace", disabled: true, onclick: function() {
						if (!self.replace(win.find('#replace').value())) {
							win.statusbar.items().slice(1).disabled(true);  //除了第一个查找按钮，其他的都disable
							currentIndex = -1;
							last = {};
						}
					}},
					{text: "Replace all", disabled: true, onclick: function() {
						self.replace(win.find('#replace').value(), true, true);
						win.statusbar.items().slice(1).disabled(true);
						last = {};
					}},
					{type: "spacer", flex: 1},
					{text: "Prev", name: 'prev', disabled: true, onclick: function() {
						self.prev();
						updateButtonStates();
					}},
					{text: "Next", name: 'next', disabled: true, onclick: function() {
						self.next();
						updateButtonStates();
					}}
				],
				title: "Find and replace",
				items: {
					type: "form",
					padding: 20,
					labelGap: 30,
					spacing: 10,
					items: [
						{type: 'textbox', name: 'find', size: 40, label: 'Find', value: selectedText},
						{type: 'textbox', name: 'replace', size: 40, label: 'Replace with'},
						{type: 'checkbox', name: 'case', text: 'Match case', label: ' '},
						{type: 'checkbox', name: 'words', text: 'Whole words', label: ' '}
					]
				}
			}).renderTo().reflow();
		}

		self.init = function(ed) {
			ed.addMenuItem('searchreplace', {
				text: 'Find and replace',
				shortcut: 'Meta+F',
				onclick: showDialog,
				separator: 'before',
				context: 'edit'
			});

			ed.addButton('searchreplace', {
				tooltip: 'Find and replace',
				shortcut: 'Meta+F',
				onclick: showDialog
			});

			ed.addCommand("SearchReplace", showDialog);
			ed.shortcuts.add('Meta+F', '', showDialog);
		};

		function getElmIndex(elm) {
			var value = elm.getAttribute('data-mce-index');

			if (typeof value == "number") {
				return "" + value;
			}

			return value;
		}

		function markAllMatches(regex) {
			var node, marker;
      //创建marker span(就是找到了对应的字体，我怎样标记出来)
			marker = editor.dom.create('span', {
				"data-mce-bogus": 1
			});

			marker.className = 'mce-match-marker'; // IE 7 adds class="mce-match-marker" and class=mce-match-marker
			node = editor.getBody();

			self.done(false);

			return findAndReplaceDOMText(regex, node, marker, false, editor.schema);
		}

		function unwrap(node) {
			var parentNode = node.parentNode;

			if (node.firstChild) {
				parentNode.insertBefore(node.firstChild, node);
			}

			node.parentNode.removeChild(node);
		}

		function findSpansByIndex(index) {
			var nodes, spans = [];

			nodes = tinymce.toArray(editor.getBody().getElementsByTagName('span'));
			if (nodes.length) {
				for (var i = 0; i < nodes.length; i++) {
					var nodeIndex = getElmIndex(nodes[i]);

					if (nodeIndex === null || !nodeIndex.length) {
						continue;
					}

					if (nodeIndex === index.toString()) {
						spans.push(nodes[i]);
					}
				}
			}

			return spans;
		}

		function moveSelection(forward) {
			var testIndex = currentIndex, dom = editor.dom;

			forward = forward !== false;

			if (forward) {
				testIndex++;
			} else {
				testIndex--;
			}

			dom.removeClass(findSpansByIndex(currentIndex), 'mce-match-marker-selected');

			var spans = findSpansByIndex(testIndex);
			if (spans.length) {
				dom.addClass(findSpansByIndex(testIndex), 'mce-match-marker-selected');
				editor.selection.scrollIntoView(spans[0]);
				return testIndex;
			}

			return -1;
		}

		function removeNode(node) {
			var dom = editor.dom, parent = node.parentNode;

			dom.remove(node);

			if (dom.isEmpty(parent)) {
				dom.remove(parent);
			}
		}

		self.find = function(text, matchCase, wholeWord) {
			text = text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
			text = wholeWord ? '\\b' + text + '\\b' : text;

			var count = markAllMatches(new RegExp(text, matchCase ? 'g' : 'gi'));

			if (count) {
				currentIndex = -1;
				currentIndex = moveSelection(true);
			}

			return count;
		};

		self.next = function() {
			var index = moveSelection(true);

			if (index !== -1) {
				currentIndex = index;
			}
		};

		self.prev = function() {
			var index = moveSelection(false);

			if (index !== -1) {
				currentIndex = index;
			}
		};

		function isMatchSpan(node) {
			var matchIndex = getElmIndex(node);

			return matchIndex !== null && matchIndex.length > 0;
		}

		self.replace = function(text, forward, all) {
			var i, nodes, node, matchIndex, currentMatchIndex, nextIndex = currentIndex, hasMore;

			forward = forward !== false;  //true 往下找

			node = editor.getBody();
			nodes = tinymce.grep(tinymce.toArray(node.getElementsByTagName('span')), isMatchSpan);  //类似于filter的功能
			for (i = 0; i < nodes.length; i++) {
				var nodeIndex = getElmIndex(nodes[i]);

				matchIndex = currentMatchIndex = parseInt(nodeIndex, 10);
				if (all || matchIndex === currentIndex) {  //通过后一个条件来区分all或者替换1个。（替换1个时，此循环只进入一次）
					if (text.length) {
						nodes[i].firstChild.nodeValue = text;
						unwrap(nodes[i]); //把自定义的marker去掉。
					} else {
						removeNode(nodes[i]);
					}

					while (nodes[++i]) {
						matchIndex = parseInt(getElmIndex(nodes[i]), 10);

						if (matchIndex === currentMatchIndex) {
							removeNode(nodes[i]);
						} else {
							i--;
							break;
						}
					}

					if (forward) {
						nextIndex--;
					}
				} else if (currentMatchIndex > currentIndex) { //注currentMatchIndex是全局变量，指示已经高亮到第几个sel,把后面的index都减去1，因为要删除替换一个元素
					nodes[i].setAttribute('data-mce-index', currentMatchIndex - 1);
				}
			}

			editor.undoManager.add();
			currentIndex = nextIndex;

			if (forward) {
				hasMore = findSpansByIndex(nextIndex + 1).length > 0;
				self.next();
			} else {
				hasMore = findSpansByIndex(nextIndex - 1).length > 0;
				self.prev();
			}

			return !all && hasMore;
		};

		self.done = function(keepEditorSelection) {
			var i, nodes, startContainer, endContainer;

			nodes = tinymce.toArray(editor.getBody().getElementsByTagName('span'));
			for (i = 0; i < nodes.length; i++) {
				var nodeIndex = getElmIndex(nodes[i]);

				if (nodeIndex !== null && nodeIndex.length) {
					if (nodeIndex === currentIndex.toString()) { //记录当前高亮的选区
						if (!startContainer) {
							startContainer = nodes[i].firstChild;
						}

						endContainer = nodes[i].firstChild; //更新选区的最后一部分，会以最后一次赋值为准。
					}

					unwrap(nodes[i]);
				}
			}
      //载入当前高亮的选区
			if (startContainer && endContainer) {
				var rng = editor.dom.createRng();
				rng.setStart(startContainer, 0);
				rng.setEnd(endContainer, endContainer.data.length);

				if (keepEditorSelection !== false) {
					editor.selection.setRng(rng);
				}

				return rng;
			}
		};
	}

	tinymce.PluginManager.add('searchreplace', Plugin);
})();
