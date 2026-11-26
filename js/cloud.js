// cloud.js — تسجيل الدخول بحساب جوجل + الحفظ السحابي التلقائي (Firebase Auth + Firestore)
const FIREBASE_CONFIG = {
  "apiKey": "AIzaSyDIWhDYRODtg9YKnicui6ZtwtP2tKRqRWRo8",
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
  const shop = readJSON(SHOP_KEY, { coins: 0, up: {}, bought: {}, armor: 0, shield: 0, heart: 0, acap: 0 });
  const islands = readJSON(PROG_KEY, { b: [], won: false, migrated: true });
  const bestScore = +readJSON(BEST_KEY, 0) || 0;
  const bestWave = +readJSON(WAVE_KEY, 0) || 0;
  const settings = readJSON(SET_KEY, {});
  const updatedAt = +localStorage.getItem(TS_KEY) || 0;
  return { shop, islands, bestScore, bestWave, settings, updatedAt };
}

function isEmptyState(st) {
  const sh = st.shop || {};
  const hasBought = sh.bought && Object.keys(sh.bought).some(k => sh.bought[k]);
  const hasUp = sh.up && Object.keys(sh.up).length > 0;
  const beaten = (st.islands && Array.isArray(st.islands.b)) ? st.islands.b.length : 0;
  return (+sh.coins || 0) === 0 && !hasBought && !hasUp && (+sh.armor || 0) === 0 && (+sh.shield || 0) === 0 && (+sh.heart || 0) === 0 && (+sh.acap || 0) === 0 && beaten === 0 && (+st.bestScore || 0) === 0;
}

function mergeStates(local, cloud, sameAccount) {
  if (!cloud || typeof cloud !== 'object') return local;
  if (isEmptyState(local)) return cloud;

  const lSh = local.shop || {}, cSh = cloud.shop || {};
  const bought = { ...(cSh.bought || {}), ...(lSh.bought || {}) };
  for (const k of Object.keys(bought)) if (cSh.bought?.[k] || lSh.bought?.[k]) bought[k] = true;

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
    },
    islands: { b: beaten, won: !!(local.islands?.won || cloud.islands?.won), migrated: true },
    bestScore: Math.max(+local.bestScore || 0, +cloud.bestScore || 0),
    bestWave: Math.max(+local.bestWave || 0, +cloud.bestWave || 0),
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
    if (st.settings && Object.keys(st.settings).length) writeJSON(SET_KEY, st.settings);
    localStorage.setItem(TS_KEY, String(+st.updatedAt || Date.now()));
    if (uid) localStorage.setItem(UID_KEY, uid);
  } finally {
    window.__nsRestoring = false;
  }
}

export async function initCloud({ onCloudLoaded } = {}) {
 const box = document.getElementById('cloudBox');
 if (!box) return;

 // --- WebView / environment detection (always keep the button visible) ---
 const ua = (navigator.userAgent || '').toLowerCase();
 const isWebView = /wv|webview/.test(ua) || (ua.includes('android') && !/chrome|crios|fxios/.test(ua));
 const isMobile = /mobile|android|iphone|ipad/.test(ua) || navigator.maxTouchPoints > 0;
 const isLocalAssetOrigin = location.hostname === 'neonstorm.local'
   || location.hostname === 'localhost'
   || location.protocol === 'file:';
 box.dataset.env = isLocalAssetOrigin ? 'apk' : (isWebView ? 'webview' : (isMobile ? 'mobile' : 'desktop'));

  let fbApp, auth, db, authMod, fsMod;
  let currentUser = null;
  let saveTimer = null;
  let dirty = false;
  let syncStatus = '';

  function setStatus(txt) {
    syncStatus = txt;
    const el = document.getElementById('cloudStatus');
    if (el) el.textContent = txt;
  }

  function renderUI() {
    if (!currentUser) {
      box.innerHTML = `
        <button class="gbtn" id="btnGoogleLogin" type="button">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4 3.1c1-2.9 3.6-4.9 6.8-4.9z"/></svg>
          <span>تسجيل الدخول بحساب جوجل</span>
        </button>
        <div class="chint" id="cloudStatus">${syncStatus || 'احفظ تقدمك وأسلحتك سحابياً لتسترجعها بأي وقت'}</div>
      `;
      const btn = document.getElementById('btnGoogleLogin');
      if (btn) btn.addEventListener('click', handleSignIn);
    } else {
      const name = currentUser.displayName || currentUser.email || 'لاعب';
      const email = currentUser.email || '';
      const photo = currentUser.photoURL
        ? `<img class="cava" src="${currentUser.photoURL}" alt="" referrerpolicy="no-referrer">`
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
    if (!currentUser || !db || !fsMod) return;
    dirty = false;
    setStatus('⏳ جاري الحفظ السحابي...');
    try {
      const st = readLocalState();
      st.updatedAt = Date.now();
      localStorage.setItem(TS_KEY, String(st.updatedAt));
      localStorage.setItem(UID_KEY, currentUser.uid);
      const ref = fsMod.doc(db, 'users', currentUser.uid);
      await fsMod.setDoc(ref, {
        ...st,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        version: 1,
      }, { merge: true });
      setStatus(manual ? '✅ تمت المزامنة السحابية!' : '☁️ محفوظ سحابياً');
    } catch (err) {
      console.warn('Cloud save failed:', err);
      setStatus('⚠️ تعذر الحفظ (محفوظ على الجهاز)');
    }
  }

  async function syncOnLogin(user) {
    if (!user || !db || !fsMod) return;
    setStatus('⏳ جاري استرجاع بياناتك...');
    try {
      const ref = fsMod.doc(db, 'users', user.uid);
      const snap = await fsMod.getDoc(ref);
      const local = readLocalState();
      const sameAccount = localStorage.getItem(UID_KEY) === user.uid;

      if (snap.exists()) {
        const cloud = snap.data();
        const merged = mergeStates(local, cloud, sameAccount);
        applyStateToLocal(merged, user.uid);
        if (typeof onCloudLoaded === 'function') onCloudLoaded();
        await fsMod.setDoc(ref, {
          ...merged,
          email: user.email || '',
          displayName: user.displayName || '',
          version: 1,
        }, { merge: true });
        setStatus('☁️ تم استرجاع وحفظ بياناتك!');
      } else {
        localStorage.setItem(UID_KEY, user.uid);
        await pushNow(false);
      }
    } catch (err) {
      console.warn('Cloud sync failed:', err);
      setStatus('⚠️ تعذر الاتصال بالسحابة حالياً');
    }
  }

  async function handleSignIn() {
    if (!auth || !authMod) {
      setStatus('⚠️ تسجيل الدخول يحتاج اتصال بالإنترنت');
      return;
    }
    if (isLocalAssetOrigin) {
      setStatus('افتح اللعبة من المتصفح لتسجيل الدخول: https://mhmdaldhynat14-sudo.github.io/neon-storm/');
      try { window.open('https://mhmdaldhynat14-sudo.github.io/neon-storm/', '_blank'); } catch (e) {}
      return;
    }
    setStatus('⏳ جاري فتح حساب جوجل...');
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    // Android WebView / mobile: redirect is the only flow that works (popup blocked).
    if (isWebView || isMobile) {
      setStatus('⏳ جاري التحويل إلى جوجل...');
      try { await authMod.signInWithRedirect(auth, provider); } catch (e2) {
        setStatus('⚠️ افتح اللعبة بمتصفح Chrome لتسجيل الدخول بجوجل');
      }
      return;
    }
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        setStatus('⏳ جاري التحويل إلى جوجل...');
        try { await authMod.signInWithRedirect(auth, provider); } catch (e2) {
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

  async function handleSignOut() {
    if (!auth || !authMod) return;
    try {
      if (dirty) await pushNow(false);
      await authMod.signOut(auth);
      syncStatus = 'تم تسجيل الخروج (بياناتك محفوظة بحسابك)';
      renderUI();
    } catch {}
  }

  function scheduleSave() {
    if (!currentUser || window.__nsRestoring) return;
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
    const [appMod, aMod, fMod] = await Promise.all([
      import(`${FB_BASE}/firebase-app.js`),
      import(`${FB_BASE}/firebase-auth.js`),
      import(`${FB_BASE}/firebase-firestore.js`),
    ]);
    authMod = aMod;
    fsMod = fMod;
    fbApp = appMod.initializeApp(FIREBASE_CONFIG);
    auth = aMod.getAuth(fbApp);
    db = fMod.getFirestore(fbApp);

    // Complete redirect flow if returning from signInWithRedirect.
    // In a WebView this navigation may leave the page and the result can come
    // back on a different origin / be dropped, so treat null as still-loading.
    try {
      const redirectResult = await aMod.getRedirectResult(auth);
      if (redirectResult && redirectResult.user) {
        currentUser = redirectResult.user;
        renderUI();
        await syncOnLogin(currentUser);
      }
    } catch (redirectErr) {
      console.warn('[Cloud] getRedirectResult error', redirectErr);
      if (redirectErr && redirectErr.code === 'auth/unauthorized-domain') {
        setStatus('⚠️ هذا النطاق غير مصرح به في Firebase — افتح اللعبة من الرابط الرسمي');
      }
    }

    aMod.onAuthStateChanged(auth, async user => {
      currentUser = user || null;
      renderUI();
      if (currentUser) await syncOnLogin(currentUser);
    });
  } catch (err) {
    console.warn('Firebase offline/unavailable:', err);
    setStatus('📴 وضع بدون نت — الحفظ محلي على جهازك');
  }
}