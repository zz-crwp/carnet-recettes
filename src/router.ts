/* Routeur hash — #/route/param?query, View Transitions si dispo */

export interface Route { path: string; params: Record<string, string>; query: URLSearchParams; }

type ViewFn = (root: HTMLElement, route: Route) => void | (() => void);

const routes: { pattern: RegExp; keys: string[]; fn: ViewFn }[] = [];
let cleanup: (() => void) | null = null;

export function route(pattern: string, fn: ViewFn) {
  const keys: string[] = [];
  const re = new RegExp('^' + pattern.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/?]+)'; }) + '$');
  routes.push({ pattern: re, keys, fn });
}

export function parseHash(): Route {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', params: {}, query: new URLSearchParams(qs || '') };
}

function render() {
  const r = parseHash();
  const root = document.getElementById('view')!;
  for (const def of routes) {
    const m = r.path.match(def.pattern);
    if (!m) continue;
    def.keys.forEach((k, i) => r.params[k] = decodeURIComponent(m[i + 1]));
    cleanup?.();
    cleanup = null;
    root.innerHTML = '';
    const c = def.fn(root, r);
    if (typeof c === 'function') cleanup = c;
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    return;
  }
  location.hash = '#/';
}

let lastHash = '';
export function startRouter() {
  const go = () => {
    if (location.hash === lastHash) return;
    lastHash = location.hash;
    const doc = document as any;
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      doc.startViewTransition(() => render());
    } else {
      render();
    }
  };
  window.addEventListener('hashchange', go);
  lastHash = location.hash;
  render();
}

export function rerender() { render(); }
