// daily.js — مكافأة الدخول اليومي (7 أيام) + مهمات اليوم (3 مهمات تتجدد يومياً)
const KEY = 'ns_daily_v1';

export const LOGIN_REWARDS = [150, 250, 400, 600, 850, 1200, 2000];

export const QUEST_POOL = [
  { id: 'q_head10', kind: 'headshot', target: 10, reward: 250, icon: '🎯', title: 'جيب 10 هيدشوت' },
  { id: 'q_kill30', kind: 'kill', target: 30, reward: 200, icon: '🤖', title: 'اقتل 30 عدو' },
  { id: 'q_wave3', kind: 'wave', target: 3, reward: 300, icon: '🌊', title: 'خلّص 3 موجات' },
  { id: 'q_boss1', kind: 'boss', target: 1, reward: 350, icon: '👑', title: 'اهزم زعيم واحد' },
  { id: 'q_game1', kind: 'game', target: 1, reward: 150, icon: '🎮', title: 'العب جيم واحد' },
];

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

function pickDailyQuests(dateStr) {
  // Deterministic 3-quest selection per calendar day, always varied
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
  const pool = [...QUEST_POOL];
  const chosen = [];
  let seed = Math.abs(h) || 7;
  while (chosen.length < 3 && pool.length) {
    const idx = seed % pool.length;
    chosen.push(pool.splice(idx, 1)[0]);
    seed = (seed * 31 + 17) >>> 0;
  }
  return chosen.map(q => ({ id: q.id, progress: 0, claimed: false }));
}

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { s = null; }
  s = s && typeof s === 'object' ? s : {};
  const today = todayStr();
  let streak = Math.max(0, Math.min(7, +s.streak || 0));
  const lastClaimDate = typeof s.lastClaimDate === 'string' ? s.lastClaimDate : '';

  // If last claim was before yesterday (and not today), streak resets on next claim
  let quests = Array.isArray(s.quests) ? s.quests : null;
  let questDate = typeof s.questDate === 'string' ? s.questDate : '';
  if (questDate !== today || !quests || quests.length !== 3) {
    questDate = today;
    quests = pickDailyQuests(today);
  } else {
    quests = quests.map(q => ({
      id: String(q.id || ''),
      progress: Math.max(0, +q.progress || 0),
      claimed: !!q.claimed,
    }));
  }
  return { streak, lastClaimDate, questDate, quests };
}

let st = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
    if (!window.__nsRestoring) {
      localStorage.setItem('ns_local_ts', String(Date.now()));
      window.dispatchEvent(new CustomEvent('ns:save'));
    }
  } catch {}
}

function ensureFreshDay() {
  const today = todayStr();
  if (st.questDate !== today) {
    st.questDate = today;
    st.quests = pickDailyQuests(today);
    save();
  }
}

export const Daily = {
  LOGIN_REWARDS,
  QUEST_POOL,
  reload() { st = load(); },
  state() { ensureFreshDay(); return st; },

  canClaimLogin() {
    ensureFreshDay();
    return st.lastClaimDate !== todayStr();
  },

  // 1..7 representing which day card is NEXT (or just claimed today)
  currentLoginDay() {
    const today = todayStr();
    const yest = yesterdayStr();
    if (st.lastClaimDate === today) return Math.max(1, Math.min(7, st.streak || 1));
    if (st.lastClaimDate === yest) return (st.streak % 7) + 1;
    return 1;
  },

  claimLogin(Shop) {
    ensureFreshDay();
    const today = todayStr();
    if (st.lastClaimDate === today) return { ok: false, reason: 'already_claimed' };
    const day = this.currentLoginDay();
    const reward = LOGIN_REWARDS[day - 1] || 150;
    st.streak = day;
    st.lastClaimDate = today;
    if (Shop) Shop.add(reward);
    save();
    return { ok: true, day, reward };
  },

  quests() {
    ensureFreshDay();
    return st.quests.map(q => {
      const def = QUEST_POOL.find(d => d.id === q.id) || QUEST_POOL[0];
      return {
        ...def,
        progress: Math.min(def.target, q.progress),
        done: q.progress >= def.target,
        claimed: !!q.claimed,
      };
    });
  },

  claimQuest(id, Shop) {
    ensureFreshDay();
    const q = st.quests.find(x => x.id === id);
    const def = QUEST_POOL.find(d => d.id === id);
    if (!q || !def || q.claimed || q.progress < def.target) return { ok: false };
    q.claimed = true;
    if (Shop) Shop.add(def.reward);
    save();
    return { ok: true, reward: def.reward, quest: def };
  },

  hasClaimable() {
    ensureFreshDay();
    if (this.canClaimLogin()) return true;
    return this.quests().some(q => q.done && !q.claimed);
  },

  record(kind, delta = 1) {
    ensureFreshDay();
    const newlyCompleted = [];
    let changed = false;
    for (const q of st.quests) {
      const def = QUEST_POOL.find(d => d.id === q.id);
      if (!def || def.kind !== kind || q.claimed) continue;
      const prev = q.progress;
      if (prev < def.target) {
        q.progress = Math.min(def.target, prev + delta);
        changed = true;
        if (prev < def.target && q.progress >= def.target) {
          newlyCompleted.push(def);
        }
      }
    }
    if (changed) save();
    return newlyCompleted;
  },

  onKill({ head = false, boss = false } = {}) {
    const out = [...this.record('kill', 1)];
    if (head) out.push(...this.record('headshot', 1));
    if (boss) out.push(...this.record('boss', 1));
    return out;
  },

  onWaveClear() {
    return this.record('wave', 1);
  },

  onGameFinish() {
    return this.record('game', 1);
  },
};
