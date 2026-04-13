const { JSDOM } = require("jsdom");

const contentHtml = `
<p>Given an array of integers <code>nums</code>.</p>
<p>&nbsp;</p>
<p><strong>Example 1:</strong></p>
<pre><strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
  <li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
</ul>
`;

const jsdom = new JSDOM();
global.document = jsdom.window.document;

function extractStructuredProblemContent(contentHtml) {
  const empty = {
    description: null,
    inputFormat: null,
    outputFormat: null,
    constraints: null,
    examples: [],
    notes: null,
    timeLimitMs: null,
    memoryLimitKb: null,
  };

  if (!contentHtml) {
    return empty;
  }

  const container = document.createElement('div');
  container.innerHTML = contentHtml;

  const children = Array.from(container.children);

  const isBoundaryHeading = (text) =>
    /^(example\s*\d*:|constraints?:|notes?:|follow\s*-?\s*up:|input:|output:)/i.test(
      String(text || '').trim()
    );

  const extractText = (node) => node.textContent || '';
  
  const sectionText = (node) =>
    extractText(node)
      .replace(/\u00a0/g, ' ')
      .trim();

  const extractFollowingSectionHtml = (headerRegex) => {
    const headerNode = children.find((child) =>
      headerRegex.test(sectionText(child))
    );
    if (!headerNode) return null;

    const chunks = [];
    let cursor = headerNode.nextElementSibling;

    while (cursor && !isBoundaryHeading(sectionText(cursor))) {
      chunks.push((cursor.outerHTML || sectionText(cursor)).trim());
      cursor = cursor.nextElementSibling;
    }

    return chunks.length > 0 ? chunks.join('\n\n') : null;
  };

  const descriptionParts = [];
  for (const child of children) {
    const text = sectionText(child);
    if (!text) continue;

    if (isBoundaryHeading(text)) {
      break;
    }
    descriptionParts.push((child.outerHTML || text).trim());
  }

  empty.description =
    descriptionParts.length > 0 ? descriptionParts.join('\n\n') : null;

  empty.inputFormat = extractFollowingSectionHtml(/^input:/i);
  empty.outputFormat = extractFollowingSectionHtml(/^output:/i);
  empty.constraints = extractFollowingSectionHtml(/^constraints?:/i);
  empty.notes = extractFollowingSectionHtml(/^notes?:/i);

  // Ex.
  return empty;
}

console.log(extractStructuredProblemContent(contentHtml));
