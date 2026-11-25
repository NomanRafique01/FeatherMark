// FeatherMark — Markdown renderer (Phase 05).
// Configured with markdown-it: html: false (strict XSS boundary), linkify on,
// GFM tables, strikethrough, task lists, heading anchor slugs, and source line mapping.

import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

const md = new MarkdownIt({
  html: false, // Strict XSS protection: raw HTML/scripts are escaped as inert text
  linkify: true,
  breaks: false,
  typographer: false,
});

md.use(taskLists, { enabled: false });

// Plugin: parse YAML frontmatter at top of file (--- ... ---) as plain text,
// preserving exact source line numbers for everything below it.
md.block.ruler.before('hr', 'frontmatter', (state, startLine, endLine, silent) => {
  if (startLine !== 0) return false;

  const firstStart = state.bMarks[0] + state.tShift[0];
  const firstEnd = state.eMarks[0];
  if (state.src.slice(firstStart, firstEnd).trim() !== '---') return false;
  if (startLine + 2 >= endLine) return false;

  const secondStart = state.bMarks[1] + state.tShift[1];
  const secondEnd = state.eMarks[1];
  const secondLine = state.src.slice(secondStart, secondEnd);
  if (!/^[A-Za-z0-9_.-]+\s*:/.test(secondLine)) return false;

  let nextLine = startLine + 2;
  let found = false;
  while (nextLine < endLine) {
    const pos = state.bMarks[nextLine] + state.tShift[nextLine];
    const max = state.eMarks[nextLine];
    const line = state.src.slice(pos, max).trim();
    if (line === '---' || line === '...') {
      found = true;
      break;
    }
    nextLine++;
  }
  if (!found) return false;
  if (silent) return true;

  const token = state.push('frontmatter', 'pre', 0);
  token.block = true;
  token.map = [0, nextLine + 1];
  token.content = state.getLines(startLine + 1, nextLine, 0, false).replace(/\n$/, '');
  state.line = nextLine + 1;
  return true;
});

md.renderer.rules.frontmatter = (tokens, idx) => {
  const token = tokens[idx];
  const lineAttr = token.map ? ` data-line="${token.map[0]}"` : '';
  return `<pre class="frontmatter"${lineAttr}><code>${md.utils.escapeHtml(token.content)}</code></pre>\n`;
};

// Plugin: add heading IDs (slugified & deduplicated) and data-line source markers
md.core.ruler.push('anchors_and_line_numbers', (state) => {
  const slugs = new Map();
  for (let i = 0; i < state.tokens.length; i++) {
    const token = state.tokens[i];
    if (token.type === 'heading_open') {
      const inline = state.tokens[i + 1];
      const title = inline ? inline.content : '';
      const baseSlug = slugify(title);
      const count = slugs.get(baseSlug) || 0;
      const slug = count > 0 ? `${baseSlug}-${count}` : baseSlug;
      slugs.set(baseSlug, count + 1);
      token.attrSet('id', slug);
      if (token.map) {
        token.attrSet('data-line', String(token.map[0]));
      }
    } else if (token.map && (token.type.endsWith('_open') || token.type === 'hr')) {
      token.attrSet('data-line', String(token.map[0]));
    }
  }
});

// Custom fence renderer: add data-line attribute to <pre>
const defaultFence = md.renderer.rules.fence || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const rendered = defaultFence(tokens, idx, options, env, self);
  if (token.map) {
    return rendered.replace(/^<pre(?=[\s>])/, `<pre data-line="${token.map[0]}"`);
  }
  return rendered;
};

export function renderMarkdown(source) {
  return md.render(source || '');
}

export { md, slugify };
