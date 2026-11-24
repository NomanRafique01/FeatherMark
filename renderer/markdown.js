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
