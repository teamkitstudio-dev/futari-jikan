import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const [html, css, app, replies] = await Promise.all([
  read('public/index.html'), read('public/styles.css'), read('public/app.js'), read('public/replies.js')
]);
const script = `${replies.replace('export function createReply', 'function standaloneReply').replaceAll('export function ', 'function ')}\n${app.replace("import { selectExpression } from './replies.js';", '')}`;
const output = html
  .replace('<link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script>', `<style>${css}</style>`)
  .replace('</body>', `<script>${script.replaceAll('</script', '<\\/script')}</script></body>`)
  .replace('会話はこのブラウザに保存されます。大切な個人情報は入力しないでください。', '単体デモ：会話は外部へ送信せず、このブラウザ内だけで処理・保存します。');
await mkdir(new URL('dist/', root), { recursive: true });
const portrait = await readFile(new URL('public/ryoko-expressions.png', root));
await writeFile(new URL('dist/futari-jikan-demo.html', root), output.replace("url('./ryoko-expressions.png')", `url('data:image/png;base64,${portrait.toString('base64')}')`));
console.log('Generated dist/futari-jikan-demo.html (self-contained, no server required)');
if (process.argv.includes('--pages')) {
  await mkdir(new URL('docs/', root), { recursive: true });
  await writeFile(new URL('docs/index.html', root), output.replace('href="/" aria-label="ふたり時間 ホーム"', 'href="./" aria-label="ふたり時間 ホーム"'));
  await writeFile(new URL('docs/.nojekyll', root), '');
  await copyFile(new URL('public/ryoko-expressions.png', root), new URL('docs/ryoko-expressions.png', root));
  console.log('Generated docs/index.html for GitHub Pages');
}
