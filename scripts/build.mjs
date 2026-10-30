import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const baseAsset = 'assets/index-CXyA2O3S-studio-v7.js';
const outputAsset = 'assets/btcarousel-studio-v9.js';

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
  // User images remain the entire background: no theme decoration over photographs.
  replace('_.selectedGenre === "gold_magic" &&', '_.selectedGenre === "gold_magic" && !i?.backgroundImage &&');
  replace('_.selectedGenre === "noble_emerald" &&', '_.selectedGenre === "noble_emerald" && !i?.backgroundImage &&');
  replace('i?.blocks.map((T) => {', 'btRenderBlocks(i, _, b).map((T) => {');
  replace('"data-block-id": T.id, onPointerDown:', '"data-block-id": T.id, "data-social-badge": T.id === BT_SOCIAL_ID ? "true" : undefined, tabIndex: !b && T.id === BT_SOCIAL_ID ? 0 : undefined, onKeyDown: event => btMoveSocialKey(T, event, _, btBadgeChange, btBadgeInteraction), onPointerDown:');
  replace('let le = T.hasCardBg ? N.cardBg : "transparent";', 'let le = T.hasCardBg ? btOpacityColor(T.cardBgColor || N.cardBg, T.cardBgOpacity) : "transparent";');
  replace('const V = H ? "Inter,', 'if (T.textColor) ne = T.textColor;\n    const V = H ? "Inter,');
  replace('justifyContent: T.verticalAlign === "top" ? "flex-start" : T.verticalAlign === "bottom" ? "flex-end" : "center" }, children: [T.blockType',
    'justifyContent: T.verticalAlign === "top" ? "flex-start" : T.verticalAlign === "bottom" ? "flex-end" : "center", ...btCardStyle(_.selectedGenre, N, y, T) }, children: [Tt.createElement(BTCardDetail, {id: _.selectedGenre, block: T, s: y, color: N.accent}), T.blockType');
  replace('WebkitTextStroke: T.textEffect === "outline" ? `${Math.max(1, 0.55 * y)}px rgba(0,0,0,0.9)` : void 0',
    'WebkitTextStroke: T.textEffect === "outline" ? `${Math.max(0, T.textStrokeWidth ?? 0.55) * y}px ${T.textStrokeColor || "rgba(0,0,0,0.9)"}` : void 0');
  replace('we = z?.blocks.find((O) => O.id === M);', 'we = btRenderBlocks(z, i).find((O) => O.id === M);');
  replace('qe = (O, ue) => {\n    if (!z) return;', 'qe = (O, ue) => {\n    if (O === BT_SOCIAL_ID) { b({socialBadge: btBadgeLayout({...i.socialBadge, ...ue}, i.ratio)}); return; }\n    if (!z) return;');
  replace('R = (O) => {\n    if (!z) return;', 'R = (O) => {\n    if (O === BT_SOCIAL_ID) { c?.(); b({socialBadge: {...i.socialBadge, enabled:false}}); w(null); C(null); return; }\n    if (!z) return;');
  replace('d.jsxs("div", { className: "w-[333px] space-y-2 select-none pt-2", id: "horizontal-slides-ribbon"', 'Tt.createElement(BTBadgeToggle, {config:i, onChange:b, onSelect:w, onStart:c}), d.jsxs("div", { className: "w-[333px] space-y-2 select-none pt-2", id: "horizontal-slides-ribbon"');
  replace('selectedBlockId: M, editingBlockId: A, editInitialHtml: N.current,',
    'selectedBlockId: M, editingBlockId: A, editInitialHtml: N.current, onSocialBadgeChange: value => b({socialBadge: value}), onSocialBadgeInteraction: c,');
  replace('}), d.jsx("button", { onClick: re,',
    '}), Tt.createElement(BTStrokeControls, {block: we, onChange: fields => qe(we.id, fields), onStart: c}), Tt.createElement(BTBlockColors, {block: we, palette:S, onChange: fields => qe(we.id, fields), onStart:c}), d.jsx("button", { onClick: re,');
  replace('customFontFamily: _.customFontFamily };', 'customFontFamily: _.customFontFamily, socialBadge: _.socialBadge };');
  replace('customFontFamily: ge.customFontFamily }),', 'customFontFamily: ge.customFontFamily, socialBadge: ge.socialBadge }),');
  replace('d.jsx(k1, { palette: i.palette,',
    'Tt.createElement(BTThemeDescription, {id: i.selectedGenre}), d.jsx(k1, { palette: i.palette,');
  // Store per-fragment highlight geometry alongside the existing rich-text tokens.
  const parserStart = code.indexOf('function Yh(i) {');
  const parserEnd = code.indexOf('\nfunction Sr(', parserStart);
  if (parserStart < 0 || parserEnd < 0) throw new Error('Rich-text parser integration anchor missing');
  code = code.slice(0, parserStart) + 'function Yh(i) { return btParseRichTokens(i); }' + code.slice(parserEnd);
  const editorStart = code.indexOf('}, te = (O, ue, be) =>');
  const editorEnd = code.indexOf('}, je = (O) => {', editorStart);
  if (editorStart < 0 || editorEnd < 0) throw new Error('Rich-text editor integration anchor missing');
  code = code.slice(0, editorStart) + '}, te = (O, ue, be) => btEditorHtml(O, ue, be), se = O => btEncodeTokens(btReadEditorTokens(O)), je = (O) => {' + code.slice(editorEnd + '}, je = (O) => {'.length);
  replace('const z = i.slides[_];', 'const [btHighlightDraft, btSetHighlightDraft] = Tt.useState(BT_HIGHLIGHT_DEFAULT);\n  const z = i.slides[_];');
  replace('style: { backgroundColor: Y.highlightColor || N.accent, color: Y.textColor || (Y.highlightStyle === "marker" ? void 0 : Y.highlightTextColor || N.accentText), boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", borderRadius: Y.highlightStyle === "marker" ? "0" : "0.286em", padding: Y.highlightStyle === "marker" ? "0" : "0.143em 0.428em", margin: Y.highlightStyle === "marker" ? "0" : "0 0.143em" }', '"data-highlight-shape": Y.highlightMeta?.shape || (Y.highlightStyle === "marker" ? "marker" : "rounded"), style: btHighlightCss(Y, N)');
  replace('O.target instanceof HTMLInputElement || O.preventDefault();', '(O.target instanceof HTMLInputElement || O.target instanceof HTMLSelectElement) || O.preventDefault();');
  replace('style: { top: `${_e.y - 45}px`, left: `${_e.x}px`, transform: "translateX(-50%)" }', 'style: { top: `${Math.max(8, _e.y - 110)}px`, left: `${Math.max(8 + Math.min(680, window.innerWidth * .95) / 2, Math.min(window.innerWidth - 8 - Math.min(680, window.innerWidth * .95) / 2, _e.x))}px`, transform: "translateX(-50%)", maxWidth:"95vw", width:680, flexWrap:"wrap" }');
  replace('children: [d.jsx("button", { onClick: () => Pe("highlight"),', 'children: [Tt.createElement(BTHighlightControls, {editorId:A, rangeRef:B, palette:S, draft:btHighlightDraft, onDraft:btSetHighlightDraft, onStart:c}), d.jsx("button", { onClick: () => Pe("highlight"),');
  replace('if (c?.(), O === "highlight" || O === "marker") {', 'if (O === "highlight" || O === "marker") { const value = O === "marker" ? {...BT_HIGHLIGHT_DEFAULT, shape:"marker", padX:0, padY:0, radius:0, color:ue || "#FCD34D"} : {...BT_HIGHLIGHT_DEFAULT,...btHighlightDraft,color:ue || S.accent}; btApplyHighlight({editorId:A,rangeRef:B,palette:S,value,onStart:c}); btSetHighlightDraft(value); k({visible:false,x:0,y:0,selectedText:""}); return; }\n    if (c?.(), O === "highlight" || O === "marker") {');
  const themes = await readFile(new URL('studio/themes.jsx', root), 'utf8');
  const features = await readFile(new URL('studio/features.jsx', root), 'utf8');
  const highlights = await readFile(new URL('studio/highlights.jsx', root), 'utf8');
  const extension = (await transform(themes + '\n' + features + '\n' + highlights, { loader: 'jsx', jsxFactory: 'Tt.createElement', jsxFragment: 'Tt.Fragment', charset: 'utf8' })).code;
  const mount = 'fp.createRoot(document.getElementById("root")).render';
  replace(mount, extension + '\nObject.assign(Ln, BT_THEMES);\n' + (testExports ? 'window.__btTest = {React:Tt, SlideView:Sr, themes:Ln, layout:btBadgeLayout, load:U1, normalize:normalizeConfigFonts, parse:Yh, highlightCss:btHighlightCss, encode:btEncodeTokens, editorHtml:btEditorHtml, readEditor:btReadEditorTokens, root:null};\n' : '') + mount);
  if (testExports) code = code.replace('fp.createRoot(document.getElementById("root")).render', '(window.__btTest.root = fp.createRoot(document.getElementById("root"))).render');
  const result = await transform(code, { format: 'esm', minify: !testExports, charset: 'utf8', target: 'es2020' });
  if (write) {
    await writeFile(new URL(outputAsset, root), result.code);
    let html = await readFile(new URL('index.html', root), 'utf8');
    html = html.replace(/\.\/assets\/(?:index-CXyA2O3S-studio-v7|btcarousel-studio-v[89])\.js/, './' + outputAsset);
    await writeFile(new URL('index.html', root), html);
    console.log(`Built ${outputAsset} (${Buffer.byteLength(result.code)} bytes) from pinned studio v7; shared social TextBlock and 28 themes.`);
  }
  return result.code;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
