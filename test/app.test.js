import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { createReply } from '../public/replies.js';

test('デモ応答は疲労、休日、あいさつを区別する', () => {
  assert.match(createReply('疲れた'), /おつかれさま/);
  assert.match(createReply('週末何しよう'), /お休み/);
  assert.match(createReply('おはよう'), /おはよう/);
  assert.match(createReply('こんにちは'), /りょうこ/);
  assert.ok(createReply('テスト').length > 0);
});
test('危機を示す言葉には現実の支援を案内する', () => {
  assert.match(createReply('死にたい'), /緊急窓口/);
});
test('HTTP経由で画面、会話、入力検証、パス制限が動く', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /ふたり時間/);
  for (const path of ['/app.js', '/styles.css']) assert.equal((await fetch(base + path)).status, 200);
  const post = message => fetch(base + '/api/chat', { method: 'POST', body: JSON.stringify({ message }) });
  const reply = await post('今日は疲れたよ');
  assert.equal(reply.status, 200); assert.match((await reply.json()).reply, /おつかれさま/);
  for (const value of ['', '   ', 42, 'あ'.repeat(1001)]) assert.equal((await post(value)).status, 400);
  assert.equal((await post('a'.repeat(17000))).status, 413);
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', body: '{' })).status, 400);
  assert.equal((await fetch(base + '/server.js')).status, 404);
  assert.equal((await fetch(base, { method: 'DELETE' })).status, 405);
});
