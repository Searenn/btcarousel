import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const baseAsset = 'assets/index-CXyA2O3S-studio-v7.js';
const outputAsset = 'assets/btcarousel-studio-v8.js';

// gh-pages contains fixes newer than main. Extend the exact published version;
// never replace it with a build of the older main branch.
export async function build({ write = true, testExports = false } = {}) {
  const original = await readFile(new URL(baseAsset, root), 'utf8');
  const hash = createHash('sha1').update(`blob ${Buffer.byteLength(original)}\0`).update(original).digest('hex');
  if (hash !== 'c24fa9323c6a5c12f113555fbb706ec1913d5375') throw new Error('Published base changed: review integration anchors before building.');
  let code = (await transform(original, { format: 'esm', charset: 'ascii' })).code;
  const replace = (before, after) => {
    if (code.split(before).length !== 2) throw new Error(`Expected exactly one integration anchor: ${before.slice(0,100)}`);
    code = code.replace(before, after);
  };
  replace('onEditableKeyDown: w }) {', 'onEditableKeyDown: w, onSocialBadgeChange: btBadgeChange, onSocialBadgeInteraction: btBadgeInteraction }) {');
  replace('return d.jsxs("div", { className: `w-full h-full relative overflow-hidden transition-all duration-300 select-none',
    'return d.jsxs("div", { "data-bt-slide": "true", className: `w-full h-full relative overflow-hidden transition-all duration-300 select-none');
  replace('}), _.selectedGenre === "gold_magic" &&',
    '}), Tt.createElement(BTThemeDecor, {id: _.selectedGenre, p: N, width: f, height: l}), _.selectedGenre === "gold_magic" &&');
  replace('justifyContent: T.verticalAlign === "top" ? "flex-start" : T.verticalAlign === "bottom" ? "flex-end" : "center" }, children: [T.blockType',
    'justifyContent: T.verticalAlign === "top" ? "flex-start" : T.verticalAlign === "bottom" ? "flex-end" : "center", ...btCardStyle(_.selectedGenre, N, y, T) }, children: [Tt.createElement(BTCardDetail, {id: _.selectedGenre, block: T, s: y, color: N.accent}), T.blockType');
  replace('WebkitTextStroke: T.textEffect === "outline" ? `${Math.max(1, 0.55 * y)}px rgba(0,0,0,0.9)` : void 0',
    'WebkitTextStroke: T.textEffect === "outline" ? `${Math.max(0, T.textStrokeWidth ?? 0.55) * y}px ${T.textStrokeColor || "rgba(0,0,0,0.9)"}` : void 0');
  replace('}), i?.swipeHintText &&',
    '}), Tt.createElement(BTSocialBadge, {config: _, width: f, isExporting: b, onChange: btBadgeChange, onStart: btBadgeInteraction}), i?.swipeHintText &&');
  replace('selectedBlockId: M, editingBlockId: A, editInitialHtml: N.current,',
    'selectedBlockId: M, editingBlockId: A, editInitialHtml: N.current, onSocialBadgeChange: value => b({socialBadge: value}), onSocialBadgeInteraction: c,');
  replace('}), d.jsx("button", { onClick: re,',
    '}), Tt.createElement(BTStrokeControls, {block: we, onChange: fields => qe(we.id, fields), onStart: c}), d.jsx("button", { onClick: re,');
  replace('customFontFamily: _.customFontFamily };', 'customFontFamily: _.customFontFamily, socialBadge: _.socialBadge };');
  replace('customFontFamily: ge.customFontFamily }),', 'customFontFamily: ge.customFontFamily, socialBadge: ge.socialBadge }),');
  replace('d.jsx(k1, { palette: i.palette,',
    'Tt.createElement(BTThemeDescription, {id: i.selectedGenre}), Tt.createElement(BTBadgeControls, {config: i, onChange: f, onStart: D}), d.jsx(k1, { palette: i.palette,');
  const themes = await readFile(new URL('studio/themes.jsx', root), 'utf8');
  const features = await readFile(new URL('studio/features.jsx', root), 'utf8');
  const extension = (await transform(themes + '\n' + features, { loader: 'jsx', jsxFactory: 'Tt.createElement', jsxFragment: 'Tt.Fragment', charset: 'utf8' })).code;
  const mount = 'fp.createRoot(document.getElementById("root")).render';
  replace(mount, extension + '\nObject.assign(Ln, BT_THEMES);\n' + (testExports ? 'window.__btTest = {React:Tt, SlideView:Sr, themes:Ln, layout:btBadgeLayout, load:U1, normalize:normalizeConfigFonts, parse:Yh, root:null};\n' : '') + mount);
  if (testExports) code = code.replace('fp.createRoot(document.getElementById("root")).render', '(window.__btTest.root = fp.createRoot(document.getElementById("root"))).render');
  const result = await transform(code, { format: 'esm', minify: !testExports, charset: 'utf8', target: 'es2020' });
  if (write) {
    await writeFile(new URL(outputAsset, root), result.code);
    let html = await readFile(new URL('index.html', root), 'utf8');
    html = html.replace(/\.\/assets\/(?:index-CXyA2O3S-studio-v7|btcarousel-studio-v8)\.js/, './' + outputAsset);
    await writeFile(new URL('index.html', root), html);
    console.log(`Built ${outputAsset} (${Buffer.byteLength(result.code)} bytes) from pinned studio v7; 8 additional themes.`);
  }
  return result.code;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
