// cloud.js — تسجيل الدخول بحساب جوجل + الحفظ السحابي التلقائي + لوحة المتصدرين العالمية (Firebase Auth + Firestore)
// يدعم المتصفح (Popup + Redirect) وتطبيق الأندرويد APK عبر AndroidBridge + Deep Link
const FIREBASE_CONFIG = {
  "apiKey": "AIzaSyDlTIDoPmp27J42ISs0VhIauIGqZaou8k4",
  "authDomain": "neon-storm-dd8aa.firebaseapp.com",
  "projectId": "neon-storm-dd8aa",
  "storageBucket": "neon-storm-dd8aa.firebasestorage.app",
  "messagingSenderId": "640957761820",
  "appId": "1:640957761820:web:f3fb22e071e219700152d9"
};

const SHOP_KEY = 'ns_shop_v1';
const PROG_KEY = 'ns_islands_v1';
const BEST_KEY = 'ns_best';
const WAVE_KEY = 'ns_best_wave';
const ENDLESS_BEST_KEY = 'ns_endless_best';
const ENDLESS_WAVE_KEY = 'ns_endless_wave';
const DAILY_KEY = 'ns_daily_v1';
const SET_KEY = 'ns_settings';
const TS_KEY = 'ns_local_ts';
const UID_KEY = 'ns_cloud_uid';

const FB_VER = '10.14.1';
const FB_BASE = `https://www.gstatic.com/firebasejs/${FB_VER}`;

function readJSON(k, def) {
  try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; }
}
function writeJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

function readLocalState() {
  const shop = readJSON(SHOP_KEY, {
    coins: 0, up: {}, bought: {}, armor: 0, shield: 0, heart: 0, acap: 0,
    skinsOwned: { default: true }, skin: 'default', fxOwned: { default: true }, headFx: 'default',
  });
  const islands = readJSON(PROG_KEY, { b: [], won: false, migrated: true });
  const bestScore = +readJSON(BEST_KEY, 0) || 0;
  const bestWave = +readJSON(WAVE_KEY, 0) || 0;
  const endlessBest = +readJSON(ENDLESS_BEST_KEY, 0) || 0;
  const endlessWave = +readJSON(ENDLESS_WAVE_KEY, 0) || 0;
  const daily = readJSON(DAILY_KEY, null);
  const settings = readJSON(SET_KEY, {});
  const updatedAt = +localStorage.getItem(TS_KEY) || 0;
  return { shop, islands, bestScore, bestWave, endlessBest, endlessWave, daily, settings, updatedAt };
}

function isEmptyState(st) {
  const sh = st.shop || {};
  const hasBought = sh.bought && Object.keys(sh.bought).some(k => sh.bought[k]);
  const hasUp = sh.up && Object.keys(sh.up).length > 0;
  const hasSkins = sh.skinsOwned && Object.keys(sh.skinsOwned).some(k => k !== 'default' && sh.skinsOwned[k]);
  const hasFx = sh.fxOwned && Object.keys(sh.fxOwned).some(k => k !== 'default' && sh.fxOwned[k]);
  const beaten = (st.islands && Array.isArray(st.islands.b)) ? st.islands.b.length : 0;
  return (+sh.coins || 0) === 0 && !hasBought && !hasUp && !hasSkins && !hasFx &&
    (+sh.armor || 0) === 0 && (+sh.shield || 0) === 0 && (+sh.heart || 0) === 0 && (+sh.acap || 0) === 0 &&
    beaten === 0 && (+st.bestScore || 0) === 0 && (+st.endlessBest || 0) === 0 && !(st.daily && st.daily.lastClaimDate);
}

function mergeDaily(lD, cD, cloudNewer) {
  if (!cD || typeof cD !== 'object') return lD || null;
  if (!lD || typeof lD !== 'object') return cD;
  const lDate = String(lD.lastClaimDate || ''), cDate = String(cD.lastClaimDate || '');
  let lastClaimDate = lDate >= cDate ? lDate : cDate;
  let streak = lDate > cDate ? (+lD.streak || 0) : cDate > lDate ? (+cD.streak || 0) : Math.max(+lD.streak || 0, +cD.streak || 0);

  const lQD = String(lD.questDate || ''), cQD = String(cD.questDate || '');
  let questDate = lQD >= cQD ? lQD : cQD;
  let quests = [];
  if (lQD === cQD && Array.isArray(lD.quests) && Array.isArray(cD.quests)) {
    const map = new Map();
    for (const q of cD.quests) map.set(q.id, { id: q.id, progress: +q.progress || 0, claimed: !!q.claimed });
    for (const q of lD.quests) {
      const prev = map.get(q.id);
      if (prev) {
        prev.progress = Math.max(prev.progress, +q.progress || 0);
        prev.claimed = !!(prev.claimed || q.claimed);
      } else {
        map.set(q.id, { id: q.id, progress: +q.progress || 0, claimed: !!q.claimed });
      }
    }
    quests = [...map.values()].slice(0, 3);
  } else {
    quests = (lQD > cQD ? lD.quests : cQD > lQD ? cD.quests : (cloudNewer ? cD.quests : lD.quests)) || [];
  }
  return { streak, lastClaimDate, questDate, quests };
}

function mergeStates(local, cloud, sameAccount) {
  if (!cloud || typeof cloud !== 'object') return local;
  if (isEmptyState(local)) return cloud;

  const lSh = local.shop || {}, cSh = cloud.shop || {};
  const bought = { ...(cSh.bought || {}), ...(lSh.bought || {}) };
  for (const k of Object.keys(bought)) if (cSh.bought?.[k] || lSh.bought?.[k]) bought[k] = true;

  const skinsOwned = { default: true, ...(cSh.skinsOwned || {}), ...(lSh.skinsOwned || {}) };
  for (const k of Object.keys(skinsOwned)) if (cSh.skinsOwned?.[k] || lSh.skinsOwned?.[k]) skinsOwned[k] = true;

  const fxOwned = { default: true, ...(cSh.fxOwned || {}), ...(lSh.fxOwned || {}) };
  for (const k of Object.keys(fxOwned)) if (cSh.fxOwned?.[k] || lSh.fxOwned?.[k]) fxOwned[k] = true;

  const up = {};
  const wIds = new Set([...Object.keys(cSh.up || {}), ...Object.keys(lSh.up || {})]);
  for (const wid of wIds) {
    const lu = (lSh.up && lSh.up[wid]) || {};
    const cu = (cSh.up && cSh.up[wid]) || {};
    up[wid] = {
      dmg: Math.max(+lu.dmg || 0, +cu.dmg || 0),
      rate: Math.max(+lu.rate || 0, +cu.rate || 0),
      mag: Math.max(+lu.mag || 0, +cu.mag || 0),
    };
  }

  const cloudNewer = (+cloud.updatedAt || 0) >= (+local.updatedAt || 0);
  const coins = sameAccount
    ? (cloudNewer ? (+cSh.coins || 0) : (+lSh.coins || 0))
    : Math.max(+lSh.coins || 0, +cSh.coins || 0);

  const skinPref = cloudNewer ? (cSh.skin || lSh.skin || 'default') : (lSh.skin || cSh.skin || 'default');
  const skin = skinsOwned[skinPref] ? skinPref : 'default';
  const fxPref = cloudNewer ? (cSh.headFx || lSh.headFx || 'default') : (lSh.headFx || cSh.headFx || 'default');
  const headFx = fxOwned[fxPref] ? fxPref : 'default';

  const lB = Array.isArray(local.islands?.b) ? local.islands.b.map(Number) : [];
  const cB = Array.isArray(cloud.islands?.b) ? cloud.islands.b.map(Number) : [];
  const beaten = [...new Set([...lB, ...cB])].filter(x => x >= 1 && x <= 50).sort((a, b) => a - b);

  const settings = cloudNewer
    ? { ...(local.settings || {}), ...(cloud.settings || {}) }
    : { ...(cloud.settings || {}), ...(local.settings || {}) };

  return {
    shop: {
      coins,
      up,
      bought,
      armor: Math.max(+lSh.armor || 0, +cSh.armor || 0),
      shield: Math.max(+lSh.shield || 0, +cSh.shield || 0),
      heart: Math.max(+lSh.heart || 0, +cSh.heart || 0),
      acap: Math.max(+lSh.acap || 0, +cSh.acap || 0),
      skinsOwned,
      skin,
      fxOwned,
      headFx,
    },
    islands: { b: beaten, won: !!(local.islands?.won || cloud.islands?.won), migrated: true },
    bestScore: Math.max(+local.bestScore || 0, +cloud.bestScore || 0),
    bestWave: Math.max(+local.bestWave || 0, +cloud.bestWave || 0),
    endlessBest: Math.max(+local.endlessBest || 0, +cloud.endlessBest || 0),
    endlessWave: Math.max(+local.endlessWave || 0, +cloud.endlessWave || 0),
    daily: mergeDaily(local.daily, cloud.daily, cloudNewer),
    settings,
    updatedAt: Math.max(+local.updatedAt || 0, +cloud.updatedAt || 0, Date.now()),
  };
}

function applyStateToLocal(st, uid) {
  window.__nsRestoring = true;
  try {
    if (st.shop) writeJSON(SHOP_KEY, st.shop);
    if (st.islands) writeJSON(PROG_KEY, st.islands);
    if (st.bestScore != null) writeJSON(BEST_KEY, +st.bestScore || 0);
    if (st.bestWave != null) writeJSON(WAVE_KEY, +st.bestWave || 0);
    if (st.endlessBest != null) writeJSON(ENDLESS_BEST_KEY, +st.endlessBest || 0);
    if (st.endlessWave != null) writeJSON(ENDLESS_WAVE_KEY, +st.endlessWave || 0);
    if (st.daily) writeJSON(DAILY_KEY, st.daily);
    if (st.settings && Object.keys(st.settings).length) writeJSON(SET_KEY, st.settings);
    localStorage.setItem(TS_KEY, String(+st.updatedAt || Date.now()));
    if (uid) localStorage.setItem(UID_KEY, uid);
  } finally {
    window.__nsRestoring = false;
  }
}

// Shared runtime handles for exported Cloud / Leaderboard helpers
let _fbApp = null, _auth = null, _db = null, _authMod = null, _fsMod = null;
let _currentUser = null;
let _sdkLoaded = false;
let _signInFn = null;
let _authReadyResolve = null;
const _authReady = new Promise(r => { _authReadyResolve = r; });

export async function submitLeaderboard(stats = {}) {
  try {
    await _authReady;
    if (!_currentUser || !_db || !_fsMod) return { ok: false, reason: 'not_signed_in' };
    const local = readLocalState();
    const uid = _currentUser.uid;
    const ref = _fsMod.doc(_db, 'leaderboard', uid);

    let existing = {};
    try {
      const snap = await _fsMod.getDoc(ref);
      if (snap.exists()) existing = snap.data() || {};
    } catch {}

    const bestScore = Math.max(+existing.bestScore || 0, +local.bestScore || 0, +stats.bestScore || 0);
    const bestWave = Math.max(+existing.bestWave || 0, +local.bestWave || 0, +stats.bestWave || 0);
    const endlessScore = Math.max(+existing.endlessScore || 0, +local.endlessBest || 0, +stats.endlessScore || 0);
    const endlessWave = Math.max(+existing.endlessWave || 0, +local.endlessWave || 0, +stats.endlessWave || 0);

    // Avoid writing totally empty 0/0 rows unless player actually played
    if (bestScore === 0 && endlessScore === 0 && bestWave === 0 && endlessWave === 0) {
      return { ok: true, skipped: true };
    }

    const payload = {
      uid,
      name: _currentUser.displayName || (_currentUser.email ? _currentUser.email.split('@')[0] : 'لاعب'),
      photo: _currentUser.photoURL || '',
      bestScore,
      bestWave,
      endlessScore,
      endlessWave,
      updatedAt: Date.now(),
    };
    await _fsMod.setDoc(ref, payload, { merge: true });
    return { ok: true, data: payload };
  } catch (err) {
    console.warn('Leaderboard submit failed:', err);
    return { ok: false, reason: err?.code || 'error', error: err };
  }
}

export async function fetchLeaderboard() {
  try {
    await Promise.race([_authReady, new Promise(r => setTimeout(r, 6000))]);
    if (!_db || !_fsMod) return { ok: false, reason: 'offline', rows: [] };
    const colRef = _fsMod.collection(_db, 'leaderboard');
    const q = _fsMod.query(colRef, _fsMod.limit(50));
    const snap = await Promise.race([
      _fsMod.getDocs(q),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'timeout' })), 8000)),
    ]);
    const rows = [];
    snap.forEach(docSnap => {
      const d = docSnap.data() || {};
      rows.push({
        uid: d.uid || docSnap.id,
        name: d.name || 'بطل النيون',
        photo: d.photo || '',
        bestScore: +d.bestScore || 0,
        bestWave: +d.bestWave || 0,
        endlessScore: +d.endlessScore || 0,
        endlessWave: +d.endlessWave || 0,
        updatedAt: +d.updatedAt || 0,
      });
    });
    return { ok: true, rows };
  } catch (err) {
    console.warn('Leaderboard fetch failed:', err);
    return { ok: false, reason: err?.code || 'error', error: err, rows: [] };
  }
}

export const Cloud = {
  submitLeaderboard,
  fetchLeaderboard,
  getUser() { return _currentUser; },
  getPlayerName() {
    if (_currentUser) {
      return _currentUser.displayName || (_currentUser.email ? _currentUser.email.split('@')[0] : 'بطل النيون');
    }
    return 'بطل النيون';
  },
  isSignedIn() { return !!_currentUser; },
  isOnline() { return !!(_sdkLoaded && _db); },
  signIn() { return _signInFn ? _signInFn() : Promise.resolve(); },
};

export async function initCloud({ onCloudLoaded, onAuthChange } = {}) {
  const box = document.getElementById('cloudBox');
  if (!box) { _authReadyResolve(); return; }

  let saveTimer = null;
  let dirty = false;
  let syncStatus = '';

  function setStatus(txt) {
    syncStatus = txt;
    const el = document.getElementById('cloudStatus');
    if (el) el.textContent = txt;
  }

  function renderUI() {
    if (!_currentUser) {
      box.innerHTML = `
        <button class="gbtn" id="btnGoogleLogin" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4 3.1c1-2.9 3.6-4.9 6.8-4.9z"/></svg>
          <span>تسجيل الدخول بحساب جوجل</span>
        </button>
        <div class="chint" id="cloudStatus">${syncStatus || 'احفظ تقدمك وأسلحتك سحابياً ونافس في المتصدرين'}</div>
      `;
      const btn = document.getElementById('btnGoogleLogin');
      if (btn) btn.addEventListener('click', handleSignIn);
    } else {
      const name = _currentUser.displayName || _currentUser.email || 'لاعب';
      const email = _currentUser.email || '';
      const photo = _currentUser.photoURL
        ? `<img class="cava" src="${_currentUser.photoURL}" alt="" referrerpolicy="no-referrer">`
        : `<div class="cava cinit">${(name[0] || 'G').toUpperCase()}</div>`;
      box.innerHTML = `
        <div class="cuser">
          ${photo}
          <div class="cmeta">
            <div class="cname">${name}</div>
            <div class="csub" id="cloudStatus">${syncStatus || '☁️ محفوظ سحابياً'}</div>
          </div>
          <div class="cact">
            <button class="cbtn" id="btnCloudSync" type="button" title="مزامنة الآن">↻</button>
            <button class="cbtn out" id="btnGoogleOut" type="button">خروج</button>
          </div>
        </div>
      `;
      document.getElementById('btnCloudSync')?.addEventListener('click', () => pushNow(true));
      document.getElementById('btnGoogleOut')?.addEventListener('click', handleSignOut);
      if (email) box.dataset.email = email;
    }
  }

  async function pushNow(manual = false) {
    if (!_currentUser || !_db || !_fsMod) return;
    dirty = false;
    setStatus('⏳ جاري الحفظ السحابي...');
    try {
      const st = readLocalState();
      st.updatedAt = Date.now();
      localStorage.setItem(TS_KEY, String(st.updatedAt));
      localStorage.setItem(UID_KEY, _currentUser.uid);
      const ref = _fsMod.doc(_db, 'users', _currentUser.uid);
      await _fsMod.setDoc(ref, {
        ...st,
        email: _currentUser.email || '',
        displayName: _currentUser.displayName || '',
        version: 2,
      }, { merge: true });
      setStatus(manual ? '✅ تمت المزامنة السحابية!' : '☁️ محفوظ سحابياً');
    } catch (err) {
      console.warn('Cloud save failed:', err);
      setStatus('⚠️ تعذر الحفظ (محفوظ على الجهاز)');
    }
  }

  async function syncOnLogin(user) {
    if (!user || !_db || !_fsMod) return;
    setStatus('⏳ جاري استرجاع بياناتك...');
    try {
      const ref = _fsMod.doc(_db, 'users', user.uid);
      const snap = await _fsMod.getDoc(ref);
      const local = readLocalState();
      const sameAccount = localStorage.getItem(UID_KEY) === user.uid;

      if (snap.exists()) {
        const cloud = snap.data();
        const merged = mergeStates(local, cloud, sameAccount);
        applyStateToLocal(merged, user.uid);
        if (typeof onCloudLoaded === 'function') onCloudLoaded();
        await _fsMod.setDoc(ref, {
          ...merged,
          email: user.email || '',
          displayName: user.displayName || '',
          version: 2,
        }, { merge: true });
        setStatus('☁️ تم استرجاع وحفظ بياناتك!');
      } else {
        localStorage.setItem(UID_KEY, user.uid);
        await pushNow(false);
      }
      // Also upsert leaderboard entry on login sync
      submitLeaderboard();
    } catch (err) {
      console.warn('Cloud sync failed:', err);
      setStatus('⚠️ تعذر الاتصال بالسحابة حالياً');
    }
  }

  async function loadFirebase() {
    if (_sdkLoaded && _auth && _db && _authMod && _fsMod) return true;
    const [appMod, aMod, fMod] = await Promise.all([
      import(`${FB_BASE}/firebase-app.js`),
      import(`${FB_BASE}/firebase-auth.js`),
      import(`${FB_BASE}/firebase-firestore.js`),
    ]);
    _authMod = aMod;
    _fsMod = fMod;
    _fbApp = appMod.initializeApp(FIREBASE_CONFIG);
    _auth = aMod.getAuth(_fbApp);
    _db = fMod.getFirestore(_fbApp);
    _sdkLoaded = true;

    // Complete redirect flow if returning from signInWithRedirect on web
    aMod.getRedirectResult(_auth).catch(() => {});

    aMod.onAuthStateChanged(_auth, async user => {
      _currentUser = user || null;
      renderUI();
      if (typeof onAuthChange === 'function') onAuthChange(_currentUser);
      if (_currentUser) await syncOnLogin(_currentUser);
    });
    return true;
  }

  // Register Android APK deep-link callback BEFORE Firebase finishes loading
  window.__onAndroidGoogleAuth = async (idToken, accessToken) => {
    setStatus('⏳ جاري تأكيد حساب جوجل...');
    try {
      await _authReady;
      if (!_auth || !_authMod) {
        await loadFirebase();
      }
      if (!_auth || !_authMod) {
        setStatus('⚠️ تسجيل الدخول يحتاج اتصال بالإنترنت');
        return;
      }
      if (!idToken && !accessToken) {
        setStatus('⚠️ لم يصل رمز التحقق من المتصفح — جرّب مرة أخرى');
        return;
      }
      const cred = _authMod.GoogleAuthProvider.credential(idToken || null, accessToken || null);
      await _authMod.signInWithCredential(_auth, cred);
    } catch (err) {
      console.warn('Android Google auth error:', err);
      const code = err?.code || '';
      setStatus('⚠️ تعذر تأكيد حساب جوجل (' + (code || 'تحقق من الإنترنت') + ')');
    }
  };

  // Flush any pending Android auth tokens delivered before initCloud ran
  if (window.__pendingAndroidGoogleAuth) {
    const pending = window.__pendingAndroidGoogleAuth;
    window.__pendingAndroidGoogleAuth = null;
    window.__onAndroidGoogleAuth(pending.idToken || '', pending.accessToken || '');
  }

  async function handleSignIn() {
    // Inside Android APK: open external browser helper to avoid Google WebView 403 block
    if (window.AndroidBridge && typeof window.AndroidBridge.startGoogleLogin === 'function') {
      setStatus('⏳ أكمل تسجيل الدخول بالمتصفح ثم ارجع للعبة...');
      try {
        window.AndroidBridge.startGoogleLogin();
      } catch (err) {
        console.warn('AndroidBridge.startGoogleLogin error:', err);
        setStatus('⚠️ تعذر فتح المتصفح لتسجيل الدخول');
      }
      return;
    }

    if (!_auth || !_authMod) {
      try {
        await loadFirebase();
      } catch {
        setStatus('⚠️ تسجيل الدخول يحتاج اتصال بالإنترنت');
        return;
      }
    }
    setStatus('⏳ جاري فتح حساب جوجل...');
    const provider = new _authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await _authMod.signInWithPopup(_auth, provider);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        setStatus('⏳ جاري التحويل إلى جوجل...');
        try { await _authMod.signInWithRedirect(_auth, provider); } catch (e2) {
          setStatus('⚠️ افتح اللعبة بمتصفح Chrome لتسجيل الدخول بجوجل');
        }
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setStatus('تم إلغاء تسجيل الدخول');
      } else {
        console.warn('Google login error:', err);
        setStatus('⚠️ تعذر تسجيل الدخول (' + (code || 'خطأ بالاتصال') + ')');
      }
    }
  }
  _signInFn = handleSignIn;

  async function handleSignOut() {
    if (!_auth || !_authMod) return;
    try {
      if (dirty) await pushNow(false);
      await _authMod.signOut(_auth);
      syncStatus = 'تم تسجيل الخروج (بياناتك محفوظة بحسابك)';
      renderUI();
    } catch {}
  }

  function scheduleSave() {
    if (!_currentUser || window.__nsRestoring) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => pushNow(false), 1200);
  }

  window.addEventListener('ns:save', scheduleSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) pushNow(false); });
  window.addEventListener('pagehide', () => { if (dirty) pushNow(false); });

  renderUI();

  // Load Firebase SDK dynamically so offline play never breaks
  try {
    await loadFirebase();
  } catch (err) {
    console.warn('Firebase offline/unavailable:', err);
    setStatus('📴 وضع بدون نت — الحفظ محلي على جهازك');
  } finally {
    _authReadyResolve();
  }
}
