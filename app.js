const prizes = [
  { name: '随机模组 ×1', short: '随机模组', color: '#ff9d4d' },
  { name: '自选模组 ×2', short: '自选模组×2', color: '#63dbd3' },
  { name: '自选模组 ×3', short: '自选模组×3', color: '#9d8cff' },
  { name: '6800 钻石', short: '6800钻石', color: '#f6d365' },
  { name: '12800 钻石', short: '12800钻石', color: '#6ca8ff' },
  { name: '32800 钻石', short: '32800钻石', color: '#f26f91' },
  { name: '6800 钻石 + 随机模组 ×1', short: '6800钻石+随机模组', color: '#65c18c' },
  { name: '12800 钻石 + 自选模组 ×1', short: '12800钻石+自选模组', color: '#f28f6f' },
];
const storageKey = 'lucky-loop-mc-v2';
const palette = prizes.map((prize) => prize.color);
let rotation = 0;
let spinning = false;
let audioContext;
const state = loadState();

// ---- 中奖播报横幅（无后端时回退到内置 10 条）----
const FALLBACK_WINNERS = [
  { nickname: '末影刺客', prize: '32800 钻石' },
  { nickname: '钻石矿工', prize: '12800 钻石' },
  { nickname: '红石大师', prize: '自选模组 ×3' },
  { nickname: '苦力怕克星', prize: '6800 钻石' },
  { nickname: '史蒂夫本人', prize: '随机模组 ×1' },
  { nickname: '下界旅行者', prize: '12800 钻石 + 自选模组 ×1' },
  { nickname: '建城玩家', prize: '自选模组 ×2' },
  { nickname: 'TNT小能手', prize: '6800 钻石 + 随机模组 ×1' },
  { nickname: '村民交易商', prize: '随机模组 ×1' },
  { nickname: '夜幕探险家', prize: '12800 钻石' },
];
let tickerSeeded = false;
async function fetchWinners() {
  try {
    const r = await fetch('api/winners');
    const data = await r.json();
    const list = (data.winners || []).slice(0, 12);
    renderTicker(list);
    const maxId = list.reduce((m, w) => Math.max(m, w.id || 0), 0);
    if (tickerSeeded && maxId > (state.lastTickerId || 0)) {
      const t = $('winTicker'); t.classList.remove('new'); void t.offsetWidth; t.classList.add('new');
    }
    state.lastTickerId = maxId;
    tickerSeeded = true;
  } catch {
    renderTicker(FALLBACK_WINNERS);
    tickerSeeded = true;
  }
}
function renderTicker(list) {
  if (!list.length) { $('tickerTrack').innerHTML = '<span class="t-item">🎉 等待第一位幸运观众...</span>'; return; }
  const html = list.map((w) => `<span class="t-item">🎉 <span class="t-name">${escapeHtml(w.nickname || '神秘玩家')}</span> 抽中 <span class="t-prize">${escapeHtml(w.prize)}</span> · 已领取</span>`).join('');
  $('tickerTrack').innerHTML = html + html;
}
async function announceWin(nickname, prize) {
  try { await fetch('api/winners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname, prize }) }); } catch {}
  fetchWinners();
}

const $ = (id) => document.getElementById(id);
function loadState() { try { return JSON.parse(localStorage.getItem(storageKey)) || { hasSpun: false, result: null }; } catch { return { hasSpun: false, result: null }; } }
function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]); }
function formatTime(seconds) { const safe = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function showToast(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1900); }
function copyText(text, success = '已复制') { if (navigator.clipboard) return navigator.clipboard.writeText(text).then(() => showToast(success)); const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); showToast(success); return Promise.resolve(); }
function claimTemplate() { const result = state.result ? prizes[state.result.index].name : '中奖项目'; return `【中奖领奖】\n中奖项目：${result}\n中奖截图：见图\n快手号：\n网易《我的世界》昵称：\nLolo 洛洛昵称：\n主播 ID：19028557`; }
function renderPrizeList() { $('prizeList').innerHTML = prizes.map((prize, index) => `<div class="prize-row"><span class="prize-dot" style="background:${prize.color}"></span><span class="prize-name">${index + 1}. ${escapeHtml(prize.name)}</span><span class="prize-chance">可中</span></div>`).join(''); }
function drawWheel() {
  const canvas = $('wheelCanvas'); const ctx = canvas.getContext('2d'); const center = canvas.width / 2; const radius = 278; ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(center, center); ctx.rotate(rotation * Math.PI / 180); const slice = Math.PI * 2 / prizes.length;
  prizes.forEach((prize, index) => { const start = -Math.PI / 2 + index * slice; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, start, start + slice); ctx.closePath(); ctx.fillStyle = prize.color; ctx.fill(); ctx.strokeStyle = '#111a28'; ctx.lineWidth = 6; ctx.stroke(); ctx.save(); ctx.rotate(start + slice / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0e1825'; ctx.font = '900 16px Inter, sans-serif'; ctx.fillText(prize.short, radius - 22, 0); ctx.restore(); });
  ctx.beginPath(); ctx.arc(0, 0, radius + 3, 0, Math.PI * 2); ctx.strokeStyle = '#edf3f8'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
}
function playTick() { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = 190 + Math.random() * 90; gain.gain.setValueAtTime(.025, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .05); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .05); }
function pickPrize() { return Math.floor(Math.random() * prizes.length); }
function spin() {
  if (spinning) return;
  if (state.hasSpun) { showToast('你已经抽过奖了，每人仅限 1 次'); showExistingResult(); return; }
  spinning = true; $('spinButton').disabled = true; $('spinHint').textContent = '旋转中'; $('statusLabel').textContent = '抽奖中'; const winnerIndex = pickPrize(); const slice = 360 / prizes.length; const target = 360 - (winnerIndex * slice + slice * (.25 + Math.random() * .5)); const startRotation = rotation; const finalRotation = rotation + 360 * 6 + target; const duration = 4200; const started = performance.now(); let lastTick = -1;
  function animate(now) { const progress = Math.min(1, (now - started) / duration); const eased = 1 - Math.pow(1 - progress, 4); rotation = startRotation + (finalRotation - startRotation) * eased; const tick = Math.floor(rotation / 12); if (tick !== lastTick) { lastTick = tick; playTick(); } drawWheel(); if (progress < 1) requestAnimationFrame(animate); else finishSpin(winnerIndex); }
  requestAnimationFrame(animate);
}
function finishSpin(index) { spinning = false; state.hasSpun = true; state.result = { index, wonAt: Date.now() }; saveState(); $('spinButton').disabled = true; $('spinButton').innerHTML = '<span>✓</span>已完成抽奖'; $('spinHint').textContent = '已抽奖'; $('statusLabel').textContent = '已完成'; $('spinNote').textContent = '本设备已完成抽奖，请按领奖说明联系主播'; announceWin('神秘玩家', prizes[index].name); openResult(index); }
function openResult(index) { $('resultPrize').textContent = prizes[index].name; $('resultModal').classList.remove('hidden'); updateCountdown(); }
function showExistingResult() { if (state.result && Number.isInteger(state.result.index)) openResult(state.result.index); }
function updateCountdown() { if (!state.result) return; const remaining = 3600 - Math.floor((Date.now() - state.result.wonAt) / 1000); $('countdownLabel').textContent = formatTime(remaining); $('countdownLabel').classList.toggle('expired', remaining <= 0); if (remaining <= 0) $('countdownLabel').textContent = '已截止'; }
function initialiseState() { renderPrizeList(); drawWheel(); if (state.hasSpun && state.result) { $('spinButton').disabled = true; $('spinButton').innerHTML = '<span>✓</span>已完成抽奖'; $('spinHint').textContent = '已抽奖'; $('statusLabel').textContent = '已完成'; $('spinNote').textContent = '本设备已完成抽奖，请按领奖说明联系主播'; } }

$('spinButton').addEventListener('click', spin); $('closeModalButton').addEventListener('click', () => $('resultModal').classList.add('hidden')); $('modalCloseButton').addEventListener('click', () => $('resultModal').classList.add('hidden')); $('resultModal').addEventListener('click', (event) => { if (event.target === $('resultModal')) $('resultModal').classList.add('hidden'); }); $('modalCopyButton').addEventListener('click', () => copyText(claimTemplate(), '领奖格式已复制')); $('copyTemplateButton').addEventListener('click', () => copyText(claimTemplate(), '领奖格式已复制')); $('copyIdButton').addEventListener('click', () => copyText('19028557', '主播 ID 已复制')); $('shareButton').addEventListener('click', () => copyText(window.location.href, '活动链接已复制')); window.addEventListener('resize', drawWheel); document.addEventListener('keydown', (event) => { if (event.code === 'Escape') $('resultModal').classList.add('hidden'); if (event.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); spin(); } }); setInterval(() => { $('clockLabel').textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false }); updateCountdown(); }, 1000); $('clockLabel').textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false }); initialiseState(); fetchWinners(); setInterval(fetchWinners, 4000);
