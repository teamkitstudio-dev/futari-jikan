const $ = (id) => document.getElementById(id);
const storageKey = 'futari-jikan.messages.v1';
const greeting = 'おかえりなさい。りょうこだよ。🌷\n今日も会いに来てくれて、うれしいな。\nどんな一日だった？ゆっくり聞かせてね。';
let messages = [];
let busy = false;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved)) messages = saved.filter(m => ['user', 'assistant'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 2000 && Number.isFinite(m.time) && !Number.isNaN(new Date(m.time).getTime())).slice(-100);
} catch { /* Storage can be unavailable in private browsing. */ }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
  catch { $('status').textContent = 'このブラウザでは会話を保存できません。'; }
}
function addMessage(message) {
  const row = document.createElement('div');
  row.className = `message ${message.role}`;
  if (message.role === 'assistant') {
    const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = '✿'; avatar.setAttribute('aria-hidden', 'true'); row.append(avatar);
  }
  const content = document.createElement('div'); content.className = 'message-content';
  if (message.role === 'assistant') { const name = document.createElement('p'); name.className = 'message-name'; name.textContent = 'りょうこ'; content.append(name); }
  const bubble = document.createElement('p'); bubble.className = 'bubble'; bubble.textContent = message.text;
  const time = document.createElement('time'); time.className = 'message-time'; time.dateTime = new Date(message.time).toISOString(); time.textContent = new Date(message.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  content.append(bubble, time); row.append(content); $('conversation').append(row); $('conversation').scrollTop = $('conversation').scrollHeight;
}
function render() {
  $('conversation').querySelectorAll('.message').forEach(el => el.remove());
  addMessage({ role: 'assistant', text: greeting, time: messages[0]?.time ?? Date.now() });
  messages.forEach(addMessage);
}
function update() {
  $('send').disabled = busy || !$('message').value.trim();
  $('count').textContent = `${$('message').value.length} / 1000`;
  $('message').style.height = 'auto'; $('message').style.height = `${Math.min($('message').scrollHeight, 120)}px`;
  $('reset').disabled = busy;
  $('suggestions').querySelectorAll('button').forEach(button => { button.disabled = busy; });
}
$('message').addEventListener('input', update);
$('message').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); }
});
$('suggestions').addEventListener('click', event => {
  if (event.target.tagName === 'BUTTON' && !busy) { $('message').value = event.target.textContent; update(); $('chat-form').requestSubmit(); }
});
$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('message').value.trim();
  if (busy || !text || text.length > 1000) return;
  busy = true; update(); $('status').textContent = 'りょうこがお返事を考えています…';
  const user = { role: 'user', text, time: Date.now() };
  addMessage(user); $('message').value = ''; update();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let data;
    if (typeof standaloneReply === 'function') {
      data = { reply: standaloneReply(text) };
    } else {
      const response = await fetch('./api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }), signal: controller.signal });
      if (!response.ok) throw new Error('Request failed');
      data = await response.json();
    }
    if (typeof data.reply !== 'string') throw new Error('Invalid reply');
    const reply = { role: 'assistant', text: data.reply, time: Date.now() };
    messages.push(user, reply); messages = messages.slice(-100); addMessage(reply);
    $('status').textContent = 'Enter で送信 · Shift + Enter で改行'; save();
  } catch {
    render(); $('message').value = text; $('status').textContent = '送信できませんでした。もう一度送信してください。';
  } finally { clearTimeout(timeout); busy = false; update(); $('message').focus(); }
});
$('reset').addEventListener('click', () => $('reset-dialog').showModal());
$('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
$('confirm-reset').addEventListener('click', () => {
  messages = []; save(); render(); $('reset-dialog').close(); $('status').textContent = '会話をリセットしました。'; $('message').focus();
});
render(); update();
$('startup-notice').hidden = true;
