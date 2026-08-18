// <world-map> — real Natural Earth geometry via d3-geo + TopoJSON.
// Attributes:
//   projection = "naturalEarth" | "mercator"
//   land, edge, accent           (colors)
//   graticule = "on"             (draw lat/long grid)
//   dots = "on"                  (render land as a dot matrix instead of filled paths)
//   markers = "lon,lat:Label;…"
//   routes  = "lon,lat>lon,lat;…"
//   draw = "on"                  (animate route arcs drawing in)
(function () {
  const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  let atlasData = null;
  let atlasPromise = null;
  const D3_SRC = 'https://unpkg.com/d3@7.9.0/dist/d3.min.js';
  const D3_SRI = 'sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i';
  const TOPO_SRC = 'https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js';
  const TOPO_SRI = 'sha384-Ukv1p/xTma6P4/2bY5KzWBw+ydSpXmhCMtyciIQVDJ1RmOxtCYNMF1uXT9T63H67';
  function g() { return (typeof window !== 'undefined' && window) || globalThis; }
  function have() {
    const w = g();
    return !!((w.d3 || (typeof d3 !== 'undefined' && d3)) && (w.topojson || (typeof topojson !== 'undefined' && topojson)));
  }
  function lib(name) {
    const w = g();
    if (w[name]) return w[name];
    return name === 'd3' ? d3 : topojson;
  }
  function inject(src, sri) {
    const doc = g().document;
    if (doc.querySelector('script[src="' + src + '"]')) return;
    const s = doc.createElement('script');
    s.src = src; s.integrity = sri; s.crossOrigin = 'anonymous';
    doc.head.appendChild(s);
  }
  function libsReady() {
    return new Promise((res, rej) => {
      if (have()) return res();
      let waited = 0;
      const t = setInterval(() => {
        waited += 60;
        if (have()) { clearInterval(t); return res(); }
        if (waited === 900) { inject(D3_SRC, D3_SRI); inject(TOPO_SRC, TOPO_SRI); }
        if (waited > 12000) { clearInterval(t); rej(new Error('d3/topojson never loaded')); }
      }, 60);
    });
  }
  function atlas() {
    if (atlasData) return Promise.resolve(atlasData);
    if (!atlasPromise) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      atlasPromise = fetch(ATLAS, { signal: ctrl.signal, cache: 'force-cache' })
        .then((r) => { if (!r.ok) throw new Error('atlas ' + r.status); return r.json(); })
        .then((j) => { clearTimeout(timer); atlasData = j; atlasPromise = null; return j; })
        .catch((e) => { clearTimeout(timer); atlasPromise = null; throw e; });
    }
    return atlasPromise;
  }

  class WorldMap extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block';
      this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this._boot();
      this._ro = new ResizeObserver(() => this._schedule());
      this._ro.observe(this);
    }
    disconnectedCallback() { if (this._ro) this._ro.disconnect(); }
    _schedule() {
      clearTimeout(this._t);
      this._t = setTimeout(() => {
        if (this._geo) this._render();
        else this._boot();
      }, 60);
    }
    async _boot(attempt) {
      const n = attempt || 0;
      try {
        await libsReady();
        const topo = await atlas();
        const topojsonLib = lib('topojson');
        this._geo = topojsonLib.feature(topo, topo.objects.countries);
        this._land = topojsonLib.feature(topo, topo.objects.land);
        this._render();
      } catch (e) {
        console.warn('[world-map] boot failed', e);
        atlasPromise = null;
        if (n < 8 && this.isConnected) setTimeout(() => this._boot(n + 1), 500 * (n + 1));
      }
    }
    _render() {
      const d3 = lib('d3');
      const w = this.clientWidth || 800;
      const h = this.clientHeight || 400;
      if (!w || !h) return;
      const land = this.getAttribute('land') || '#2b2e3d';
      const edge = this.getAttribute('edge') || '#3f424d';
      const accent = this.getAttribute('accent') || '#9184d9';
      const proj = (this.getAttribute('projection') === 'mercator'
        ? d3.geoMercator() : d3.geoNaturalEarth1());
      proj.fitSize([w, h], this._geo);
      const path = d3.geoPath(proj);

      const parts = [];
      parts.push(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">`);

      if (this.getAttribute('graticule') === 'on') {
        const g = d3.geoGraticule10();
        parts.push(`<path d="${path(g)}" fill="none" stroke="${edge}" stroke-width="0.6" opacity="0.5"/>`);
      }

      if (this.getAttribute('dots') === 'on') {
        const step = Number(this.getAttribute('dot-step') || 9);
        const r = Number(this.getAttribute('dot-size') || 1.6);
        const inside = [];
        for (let y = step / 2; y < h; y += step) {
          for (let x = step / 2; x < w; x += step) {
            const ll = proj.invert && proj.invert([x, y]);
            if (!ll) continue;
            if (d3.geoContains(this._land, ll)) inside.push([x, y]);
          }
        }
        parts.push(inside.map(([x, y]) =>
          `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${land}"/>`).join(''));
      } else {
        parts.push(`<path d="${path(this._geo)}" fill="${land}" stroke="${edge}" stroke-width="0.7"/>`);
      }

      // routes as great-circle arcs
      const routes = (this.getAttribute('routes') || '').split(';').filter(Boolean);
      routes.forEach((seg, i) => {
        const [a, b] = seg.split('>').map((s) => s.split(',').map(Number));
        if (!a || !b || a.length < 2 || b.length < 2) return;
        const line = { type: 'LineString', coordinates: d3.range(0, 1.001, 0.02).map((t) => d3.geoInterpolate(a, b)(t)) };
        const d = path(line);
        const anim = this.getAttribute('draw') === 'on'
          ? ` stroke-dasharray="1200" stroke-dashoffset="1200" style="animation:wm-draw 2.6s ${(i * 0.5).toFixed(2)}s cubic-bezier(.4,0,.2,1) forwards"`
          : '';
        parts.push(`<path d="${d}" fill="none" stroke="${accent}" stroke-width="1.4" stroke-linecap="round" opacity="0.85"${anim}/>`);
      });

      // markers
      const markers = (this.getAttribute('markers') || '').split(';').filter(Boolean);
      markers.forEach((m, i) => {
        const [coords, label] = m.split(':');
        const ll = coords.split(',').map(Number);
        const p = proj(ll);
        if (!p) return;
        const [x, y] = p;
        parts.push(`<circle cx="${x}" cy="${y}" r="14" fill="${accent}" opacity="0.14" style="animation:wm-pulse 3.2s ${(i * 0.4).toFixed(2)}s ease-out infinite"/>`);
        parts.push(`<circle cx="${x}" cy="${y}" r="3.4" fill="${accent}"/>`);
        if (label) {
          parts.push(`<text x="${x + 9}" y="${y + 3.5}" fill="#cfd3e5" font-family="ui-monospace,Menlo,monospace" font-size="10" letter-spacing="0.06em">${label}</text>`);
        }
      });
      parts.push('</svg>');

      this.innerHTML =
        `<style>@keyframes wm-pulse{0%{r:4;opacity:.34}70%{r:20;opacity:0}100%{r:20;opacity:0}}
@keyframes wm-draw{to{stroke-dashoffset:0}}</style>` + parts.join('');
    }
  }
  if (!customElements.get('world-map')) customElements.define('world-map', WorldMap);
})();
