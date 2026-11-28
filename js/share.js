// share.js — توليد بطاقة مشاركة النتيجة 1080×1080 (PNG) + مشاركة عبر النظام أو واتساب
const GAME_URL = 'https://mhmdaldhynat14-sudo.github.io/neon-storm/';
const GAME_SHORT = 'mhmdaldhynat14-sudo.github.io/neon-storm';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderResultCardCanvas({
  playerName = 'بطل النيون',
  modeLabel = 'طور القصة',
  isEndless = false,
  score = 0,
  waveLabel = '1',
  kills = 0,
  heads = 0,
  accuracy = '0%',
  skinName = 'قياسي',
  skinSwatch = ['#545d80', '#38f3ff'],
} = {}) {
  const W = 1080, H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // 1) Deep neon background
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.28, 60, W * 0.5, H * 0.5, W * 0.78);
  bg.addColorStop(0, '#182458');
  bg.addColorStop(0.55, '#0b0f24');
  bg.addColorStop(1, '#050712');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2) Neon grid
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 246, 255, 0.10)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  // Ambient glow blobs
  const g1 = ctx.createRadialGradient(180, 180, 10, 180, 180, 320);
  g1.addColorStop(0, 'rgba(56, 246, 255, 0.20)');
  g1.addColorStop(1, 'rgba(56, 246, 255, 0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(900, 880, 10, 900, 880, 360);
  g2.addColorStop(0, 'rgba(255, 61, 240, 0.22)');
  g2.addColorStop(1, 'rgba(255, 61, 240, 0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  // 3) Outer glowing frame
  ctx.save();
  const borderGrad = ctx.createLinearGradient(0, 0, W, H);
  borderGrad.addColorStop(0, '#38f6ff');
  borderGrad.addColorStop(0.5, '#ff3df0');
  borderGrad.addColorStop(1, '#ffd166');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 6;
  ctx.shadowColor = '#38f6ff';
  ctx.shadowBlur = 24;
  roundRect(ctx, 36, 36, W - 72, H - 72, 40);
  ctx.stroke();
  ctx.restore();

  // Inner subtle frame
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, 54, 54, W - 108, H - 108, 30);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  // 4) Title
  ctx.save();
  ctx.font = '900 72px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#38f6ff';
  ctx.shadowBlur = 26;
  ctx.fillText('عاصفة النيون', W / 2, 132);
  ctx.restore();

  ctx.save();
  ctx.font = '800 26px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#38f6ff';
  ctx.letterSpacing = '4px';
  ctx.fillText('NEON STORM · 3D', W / 2, 192);
  ctx.restore();

  // 5) Player name + Mode badge
  ctx.save();
  roundRect(ctx, 110, 232, W - 220, 92, 24);
  ctx.fillStyle = 'rgba(18, 25, 58, 0.85)';
  ctx.fill();
  ctx.strokeStyle = isEndless ? 'rgba(255, 61, 240, 0.65)' : 'rgba(56, 246, 255, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = '800 34px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#eef3ff';
  ctx.fillText(`👤 ${String(playerName).slice(0, 24)}   ·   ${modeLabel}`, W / 2, 278);
  ctx.restore();

  // 6) Big glowing Score box
  ctx.save();
  roundRect(ctx, 110, 352, W - 220, 224, 30);
  const scBg = ctx.createLinearGradient(110, 352, W - 110, 576);
  scBg.addColorStop(0, 'rgba(56, 246, 255, 0.16)');
  scBg.addColorStop(1, 'rgba(255, 61, 240, 0.16)');
  ctx.fillStyle = scBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = '800 30px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText('النتيجة النهائية', W / 2, 405);

  ctx.font = '900 112px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = 'rgba(255, 209, 102, 0.75)';
  ctx.shadowBlur = 28;
  ctx.fillText(Number(score || 0).toLocaleString('en-US'), W / 2, 502);
  ctx.restore();

  // 7) 4 Stat Tiles (2x2)
  const tiles = [
    { label: isEndless ? 'الموجة' : 'المرحلة', value: String(waveLabel), color: '#38f6ff' },
    { label: 'القتلى', value: String(kills), color: '#ff3df0' },
    { label: 'إصابات الرأس', value: String(heads), color: '#ffd166' },
    { label: 'الدقة', value: String(accuracy), color: '#5dff8f' },
  ];
  const tw = 415, th = 122, gap = 30, sx = 110, sy = 602;
  tiles.forEach((t, idx) => {
    const col = idx % 2, row = Math.floor(idx / 2);
    const x = sx + col * (tw + gap), y = sy + row * (th + 22);
    ctx.save();
    roundRect(ctx, x, y, tw, th, 22);
    ctx.fillStyle = 'rgba(13, 19, 44, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '700 24px Cairo, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(238, 243, 255, 0.72)';
    ctx.fillText(t.label, x + tw / 2, y + 36);

    ctx.font = '900 44px Cairo, system-ui, sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(t.value, x + tw / 2, y + 84);
    ctx.restore();
  });

  // 8) Equipped Skin Badge
  ctx.save();
  roundRect(ctx, 250, 888, W - 500, 56, 28);
  const skG = ctx.createLinearGradient(250, 888, W - 250, 944);
  skG.addColorStop(0, skinSwatch[0] || '#38f6ff');
  skG.addColorStop(1, skinSwatch[1] || '#ff3df0');
  ctx.fillStyle = 'rgba(15, 22, 52, 0.9)';
  ctx.fill();
  ctx.strokeStyle = skG;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = '800 25px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`🎨 سكن السلاح: ${skinName}`, W / 2, 916);
  ctx.restore();

  // 9) Call-to-action footer
  ctx.save();
  ctx.font = '800 32px Cairo, system-ui, sans-serif';
  ctx.fillStyle = '#38f6ff';
  ctx.fillText('هل تقدر تكسر رقمي؟ 👇', W / 2, 982);

  ctx.direction = 'ltr';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(GAME_SHORT, W / 2, 1022);
  ctx.restore();

  return c;
}

export async function shareResultCard(stats) {
  const canvas = renderResultCardCanvas(stats);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const scoreTxt = Number(stats.score || 0).toLocaleString('en-US');
  const shareText = `🔥 حققت نتيجة ${scoreTxt} في لعبة «عاصفة النيون» (${stats.modeLabel || 'طور القصة'} · ${stats.waveLabel})!\n💀 القتلى: ${stats.kills} | 🎯 هيدشوت: ${stats.heads} | الدقة: ${stats.accuracy}\nهل تقدر تكسر رقمي؟ 👇\n${GAME_URL}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  try {
    if (blob && typeof File !== 'undefined' && navigator.share) {
      const file = new File([blob], 'neon-storm-score.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'عاصفة النيون — نتيجتي 🔥',
          text: shareText,
          url: GAME_URL,
        });
        return { ok: true, method: 'native-file', waUrl, size: blob.size };
      }
      await navigator.share({
        title: 'عاصفة النيون — نتيجتي 🔥',
        text: shareText,
        url: GAME_URL,
      });
      return { ok: true, method: 'native-text', waUrl, size: blob ? blob.size : 0 };
    }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return { ok: false, aborted: true, waUrl, size: blob ? blob.size : 0 };
    }
  }

  // Fallback: instant PNG download + WhatsApp share URL
  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = blob ? URL.createObjectURL(blob) : dataUrl;
    a.download = `neon-storm-${stats.score || 0}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      if (blob) try { URL.revokeObjectURL(a.href); } catch {}
    }, 800);
  } catch {}

  return { ok: true, method: 'download', waUrl, dataUrl, text: shareText, size: blob ? blob.size : 0 };
}
