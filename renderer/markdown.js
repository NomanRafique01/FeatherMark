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
  // GitHub READMEs commonly use a small HTML subset for centered titles and
  // badges. HTML is sanitized below so that subset works without exposing
  // scripts, styles, event handlers, or arbitrary embedded content.
  html: true,
  linkify: true,
  breaks: false,
  typographer: false,
});

md.use(taskLists, { enabled: false });

// Resolve README-style image references against the Markdown document. This
// keeps local images working when a file is opened from Explorer while leaving
// remote badges and data images intact.
function pathToFileUrl(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  if (!normalized) return '';

  if (normalized.startsWith('//')) {
    const [, , host, ...segments] = normalized.split('/');
    return `file://${host}/${segments.map((part) => encodeURIComponent(part)).join('/')}`;
  }

  const parts = normalized.split('/').map((part, index) => {
    // Keep the drive separator readable in file:///C:/... URLs.
    if (index === 0 && /^[A-Za-z]:$/.test(part)) return part;
    return encodeURIComponent(part);
  });

  if (/^[A-Za-z]:\//.test(normalized)) return `file:///${parts.join('/')}`;
  if (normalized.startsWith('/')) return `file://${parts.join('/')}`;
  return '';
}

function resolveImageSource(source, filePath) {
  const raw = String(source || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw) || /^file:/i.test(raw) || /^data:image\//i.test(raw)) {
    return raw;
  }
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (/^[A-Za-z]:[\\/]/.test(raw) || /^\\\\/.test(raw)) return pathToFileUrl(raw);

  // Do not allow arbitrary protocols such as javascript: or vbscript:.
  if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(raw)) return '';

  const baseUrl = pathToFileUrl(filePath);
  if (!baseUrl) return raw;

  try {
    return new URL(raw.replace(/\\/g, '/'), baseUrl).href;
  } catch {
    return '';
  }
}

function resolveLinkSource(source, filePath) {
  const raw = String(source || '').trim();
  if (!raw || /^#/.test(raw) || /^(?:https?:|mailto:|tel:)/i.test(raw)) return raw;
  if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(raw) && !/^[A-Za-z]:[\\/]/.test(raw)) return '';

  const baseUrl = pathToFileUrl(filePath);
  if (!baseUrl) return raw;
  try {
    return new URL(raw.replace(/\\/g, '/'), baseUrl).href;
  } catch {
    return '';
  }
}

const SAFE_HTML_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'div', 'em',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'kbd', 'li',
  'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'summary',
  'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);

const REMOVE_HTML_TAGS = new Set(['iframe', 'object', 'script', 'style', 'textarea']);
const ALIGNABLE_HTML_TAGS = new Set(['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']);

function safeDimension(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // GitHub preserves percentage widths such as width="90%". Keep that
  // responsive value instead of parseInt() collapsing it to 90 pixels.
  if (/^\d+(?:\.\d+)?%$/.test(raw)) {
    const percentage = Number.parseFloat(raw);
    return Number.isFinite(percentage) && percentage > 0 && percentage <= 100
      ? `${percentage}%`
      : '';
  }

  if (!/^\d+$/.test(raw)) return '';
  const number = Number(raw);
  return Number.isFinite(number) && number > 0 && number <= 4096 ? String(number) : '';
}

// Older rendered-editor revisions could place Markdown syntax inside a raw
// HTML alignment block. Markdown-it intentionally treats that block as HTML,
// so the nested image/badge syntax would appear as literal text. Expand that
// legacy shape after sanitizing it so existing tabs remain readable.
function expandEmbeddedMarkdown(root, env, document) {
  const walker = document.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  for (const textNode of textNodes) {
    if (textNode.parentElement && textNode.parentElement.closest('pre, code')) continue;
    if (!/(?:!\[[^\]]*\]\(|\*\*|__|\[[^\]]+\]\()/.test(textNode.nodeValue || '')) continue;

    const rendered = md.renderInline(textNode.nodeValue, env);
    if (!rendered || rendered === md.utils.escapeHtml(textNode.nodeValue)) continue;

    const holder = document.createElement('span');
    holder.innerHTML = rendered;
    textNode.replaceWith(...Array.from(holder.childNodes));
  }
}

function sanitizeHtmlFragment(raw, env) {
  if (typeof DOMParser === 'undefined') return md.utils.escapeHtml(raw);

  const document = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html');
  const root = document.body;
  const filePath = env && env.filePath;

  function visit(parent) {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 3) continue; // text node
      if (node.nodeType !== 1) {
        node.remove();
        continue;
      }

      const tag = node.tagName.toLowerCase();
      if (REMOVE_HTML_TAGS.has(tag)) {
        node.remove();
        continue;
      }
      if (!SAFE_HTML_TAGS.has(tag)) {
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        node.remove();
        continue;
      }

      const original = new Map(Array.from(node.attributes).map((attribute) => [
        attribute.name.toLowerCase(), attribute.value,
      ]));
      while (node.attributes.length > 0) node.removeAttribute(node.attributes[0].name);

      if (tag === 'img') {
        const src = resolveImageSource(original.get('src'), filePath);
        if (!src) {
          node.replaceWith(document.createTextNode(original.get('alt') || 'Image'));
          continue;
        }
        node.setAttribute('src', src);
        node.setAttribute('data-feathermark-src', original.get('src') || src);
        node.setAttribute('alt', original.get('alt') || '');
        node.setAttribute('class', 'markdown-image');
        node.setAttribute('loading', 'lazy');
        node.setAttribute('decoding', 'async');
        if (original.has('title')) node.setAttribute('title', original.get('title'));
        for (const name of ['width', 'height']) {
          const value = safeDimension(original.get(name));
          if (value) node.setAttribute(name, value);
        }
      } else if (tag === 'a') {
        const href = resolveLinkSource(original.get('href'), filePath);
        if (href) node.setAttribute('href', href);
        if (original.has('title')) node.setAttribute('title', original.get('title'));
      } else if (ALIGNABLE_HTML_TAGS.has(tag)) {
        const align = (original.get('align') || '').toLowerCase();
        if (/^(?:left|center|right|justify)$/.test(align)) {
          node.setAttribute('data-feathermark-align', align);
        }
      } else if (tag === 'details' && original.has('open')) {
        node.setAttribute('open', '');
      }

      visit(node);
    }
  }

  visit(root);
  expandEmbeddedMarkdown(root, env, document);
  return root.innerHTML;
}

md.renderer.rules.html_inline = (tokens, idx, options, env) => (
  sanitizeHtmlFragment(tokens[idx].content, env)
);
md.renderer.rules.html_block = (tokens, idx, options, env) => (
  sanitizeHtmlFragment(tokens[idx].content, env) + '\n'
);

const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const originalSource = token.attrGet('src') || '';
  const source = resolveImageSource(token.attrGet('src'), env && env.filePath);
  if (!source) {
    const alt = token.children ? self.renderInlineAsText(token.children, options, env) : 'Image';
    return `<span class="markdown-image-fallback">${md.utils.escapeHtml(alt || 'Image')}</span>`;
  }

  token.attrSet('src', source);
  token.attrSet('data-feathermark-src', originalSource);
  token.attrSet('class', 'markdown-image');
  token.attrSet('loading', 'lazy');
  token.attrSet('decoding', 'async');
  return defaultImage(tokens, idx, options, env, self);
};

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

export function renderMarkdown(source, { filePath = null } = {}) {
  return md.render(source || '', { filePath });
}

export { md, slugify, pathToFileUrl, resolveImageSource, resolveLinkSource, sanitizeHtmlFragment };
