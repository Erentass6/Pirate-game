// ============================================
// game.js — Korsan Savaşları — Tam Sürüm
// ============================================

// ---- AYARLAR ----
const BOYUT       = 6;
const TEHLIKE_OLK = 0.48;
const DOST_OLK    = 0.15;
const HAZINE_OLK  = 0.08;
const REGEN_SURE  = 3000;   // ms — can yenileme hızı
const REGEN_MIKTAR = 1;     // Her döngüde kazanılan can

// ---- NPC TANIMLARI ----
const NPC_SABLONLAR = [
  // DOSTLAR
  { ad:'Deniz Askeri', ikon:'⚓', tip:'dost', renk:'#80c8ff',
    mesajlar:['Kaptan! Rüzgar güneye dönüyor.','Dikkat et, fırtına yaklaşıyor!','Hazinem güvende.'], odul:10 },
  { ad:'Yaralı Denizci', ikon:'🤕', tip:'dost', renk:'#80c8ff',
    mesajlar:['Beni kurtardın kaptan...','Teşekkürler...','Küçük bir armağan.'], odul:18 },
  { ad:'Tüccar', ikon:'🧳', tip:'dost', renk:'#c8e080',
    mesajlar:['İyi yolculuklar!','Batıya gidin, fırtına yok.','Altın alın kaptan.'], odul:25 },
  // DÜŞMANLAR
  { ad:'Haydut Korsan', ikon:'🗡️', tip:'dusman',
    hp:14, atk:5, def:1, odul:15, xp:10, desc:'Açgözlü haydudu', renk:'#e05050' },
  { ad:'Deniz Canavarı', ikon:'🐙', tip:'dusman',
    hp:22, atk:8, def:2, odul:30, xp:20, desc:'Dev ahtapot', renk:'#c050c0' },
  { ad:'İskelet Kaptan', ikon:'💀', tip:'dusman',
    hp:30, atk:10, def:4, odul:50, xp:35, desc:'Ölümsüz korsan', renk:'#e0e0e0' },
  { ad:'Fırtına Ruhu', ikon:'⚡', tip:'dusman',
    hp:18, atk:12, def:0, odul:40, xp:25, desc:'Denizin lanetlisi', renk:'#f0c040' },
  // PATRON
  { ad:'Korsan Gemisi', ikon:'🚢', tip:'patron',
    hp:50, atk:9, def:6, odul:120, xp:80, desc:'Son patron!', renk:'#cc6030' },
];
const HAZINE_IKONLAR = ['⚓','🏴‍☠️','🦜','⚔️','🌊','🏖️','🐚','💎'];

// ---- SES ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
let sesAcik = true;

function ses(tip) {
  if (!sesAcik) return;
  try {
    if (!actx) actx = new AudioCtx();
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    const n = actx.currentTime;
    switch(tip) {
      case 'adim':  o.type='sine';      o.frequency.value=380; g.gain.setValueAtTime(.07,n); g.gain.exponentialRampToValueAtTime(.001,n+.1); o.start(n);o.stop(n+.1); break;
      case 'atk':   o.type='sawtooth'; o.frequency.setValueAtTime(250,n); o.frequency.exponentialRampToValueAtTime(100,n+.25); g.gain.setValueAtTime(.15,n); g.gain.exponentialRampToValueAtTime(.001,n+.25); o.start(n);o.stop(n+.25); break;
      case 'hasar': o.type='square';   o.frequency.setValueAtTime(180,n); o.frequency.exponentialRampToValueAtTime(60,n+.3);  g.gain.setValueAtTime(.18,n); g.gain.exponentialRampToValueAtTime(.001,n+.3);  o.start(n);o.stop(n+.3);  break;
      case 'kazan': [523,659,784,1047].forEach((f,i)=>{const o2=actx.createOscillator(),g2=actx.createGain();o2.connect(g2);g2.connect(actx.destination);o2.type='sine';o2.frequency.value=f;const t=n+i*.1;g2.gain.setValueAtTime(.12,t);g2.gain.exponentialRampToValueAtTime(.001,t+.4);o2.start(t);o2.stop(t+.5);}); break;
      case 'oldu':  o.type='sawtooth'; o.frequency.setValueAtTime(200,n); o.frequency.exponentialRampToValueAtTime(30,n+1);   g.gain.setValueAtTime(.2,n);  g.gain.exponentialRampToValueAtTime(.001,n+1);   o.start(n);o.stop(n+1);   break;
      case 'sinir': o.type='square';   o.frequency.value=160; g.gain.setValueAtTime(.07,n); g.gain.exponentialRampToValueAtTime(.001,n+.08); o.start(n);o.stop(n+.08); break;
      case 'altin': [660,880].forEach((f,i)=>{const o2=actx.createOscillator(),g2=actx.createGain();o2.connect(g2);g2.connect(actx.destination);o2.type='sine';o2.frequency.value=f;const t=n+i*.08;g2.gain.setValueAtTime(.1,t);g2.gain.exponentialRampToValueAtTime(.001,t+.25);o2.start(t);o2.stop(t+.3);}); break;
      case 'kac':   o.type='sine';     o.frequency.setValueAtTime(440,n); o.frequency.exponentialRampToValueAtTime(220,n+.4); g.gain.setValueAtTime(.1,n);  g.gain.exponentialRampToValueAtTime(.001,n+.4);  o.start(n);o.stop(n+.4);  break;
      case 'regen': o.type='sine';     o.frequency.value=660; g.gain.setValueAtTime(.04,n); g.gain.exponentialRampToValueAtTime(.001,n+.15); o.start(n);o.stop(n+.15); break;
    }
  } catch(e){}
}

// ---- ARKA PLAN MÜZİĞİ ----
let muzikAcik = false;
let muzikInterval = null;
let muzikNodlar = [];

function muzikBaslat() {
  if (!sesAcik) return;
  try {
    if (!actx) actx = new AudioCtx();
    muzikDurdur();

    // Basit döngülü deniz ambiyansı — düşük frekanslı dalga
    const notalar = [220,196,220,247,220,196,174,196];
    let idx = 0;

    function calNota() {
      if (!muzikAcik) return;
      const o = actx.createOscillator();
      const g = actx.createGain();
      const filt = actx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 800;
      o.connect(filt); filt.connect(g); g.connect(actx.destination);
      o.type = 'sine';
      o.frequency.value = notalar[idx % notalar.length];
      const n = actx.currentTime;
      g.gain.setValueAtTime(0, n);
      g.gain.linearRampToValueAtTime(0.06, n + 0.3);
      g.gain.linearRampToValueAtTime(0.03, n + 0.8);
      g.gain.linearRampToValueAtTime(0,    n + 1.1);
      o.start(n); o.stop(n + 1.2);
      muzikNodlar.push(o);
      idx++;
      muzikInterval = setTimeout(calNota, 900);
    }
    calNota();

    // Sürekli deniz uğultusu
    const noise = actx.createOscillator();
    const noiseGain = actx.createGain();
    const noiseFilt = actx.createBiquadFilter();
    noise.type = 'sawtooth'; noise.frequency.value = 55;
    noiseFilt.type = 'bandpass'; noiseFilt.frequency.value = 120; noiseFilt.Q.value = 0.3;
    noise.connect(noiseFilt); noiseFilt.connect(noiseGain); noiseGain.connect(actx.destination);
    noiseGain.gain.value = 0.04;
    noise.start();
    muzikNodlar.push(noise);
  } catch(e){}
}

function muzikDurdur() {
  clearTimeout(muzikInterval);
  muzikNodlar.forEach(n => { try { n.stop(); } catch(e){} });
  muzikNodlar = [];
}

// ---- YARDIMCI ----
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ---- OYUN DURUMU ----
let oyun = {}, muharebe = null, regenTimer = null;

// ============================================
// YENİ OYUN
// ============================================
function yeniOyun() {
  clearInterval(regenTimer);

  const grid = [];
  for (let r = 0; r < BOYUT; r++) {
    grid.push([]);
    for (let c = 0; c < BOYUT; c++)
      grid[r].push({ tip:'bos', gorundu:false, npc:null, ikon:null });
  }

  for (let r = 0; r < BOYUT; r++) {
    for (let c = 0; c < BOYUT; c++) {
      if (r===0 && c===0) continue;
      if (r===BOYUT-1 && c===BOYUT-1) {
        const tpl = NPC_SABLONLAR.find(n=>n.tip==='patron');
        grid[r][c].tip = 'patron';
        grid[r][c].npc = { ...tpl, curHp: tpl.hp };
        continue;
      }
      const x = Math.random();
      if (x < TEHLIKE_OLK) {
        const d = NPC_SABLONLAR.filter(n=>n.tip==='dusman');
        const tpl = d[rnd(0, d.length-1)];
        grid[r][c].tip = 'dusman';
        grid[r][c].npc = { ...tpl, curHp: tpl.hp };
      } else if (x < TEHLIKE_OLK + DOST_OLK) {
        const d = NPC_SABLONLAR.filter(n=>n.tip==='dost');
        const tpl = d[rnd(0, d.length-1)];
        grid[r][c].tip = 'dost';
        grid[r][c].npc = { ...tpl };
      } else if (x < TEHLIKE_OLK + DOST_OLK + HAZINE_OLK) {
        grid[r][c].tip = 'hazine';
        grid[r][c].ikon = HAZINE_IKONLAR[rnd(0, HAZINE_IKONLAR.length-1)];
      }
    }
  }

  oyun = {
    grid,
    oyuncu: { r:0, c:0, hp:20, maxHp:20, atk:8, def:3,
              xp:0, lvl:1, altin:0, kills:0, steps:0, xpLimit:50, skilCd:0 },
    bitti: false, kazandi: false
  };

  grid[0][0].gorundu = true;
  acKomsu(0, 0);
  muharebe = null;

  document.getElementById('combat-overlay').style.display = 'none';
  document.getElementById('over-overlay').style.display   = 'none';

  // ---- CAN YENİLEME DÖNGÜSÜ ----
  regenTimer = setInterval(() => {
    const p = oyun.oyuncu;
    if (oyun.bitti || muharebe) return;
    if (p.hp < p.maxHp) {
      p.hp = Math.min(p.hp + REGEN_MIKTAR, p.maxHp);
      ses('regen');
      const pw = document.getElementById('map-wrap');
      pw.classList.add('regen-anim');
      setTimeout(() => pw.classList.remove('regen-anim'), 400);
      guncelle();
    }
  }, REGEN_SURE);

  log('⚓ Yedi Denize açılıyorsun! 🚢 Korsan Gemisini yenilgiye uğrat!', 'w');
  guncelle();
}

function acKomsu(r, c) {
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>{
    const rr=r+dr, cc=c+dc;
    if (rr>=0&&rr<BOYUT&&cc>=0&&cc<BOYUT) oyun.grid[rr][cc].gorundu = true;
  });
}

function log(msg, cls='i') {
  const box = document.getElementById('log-box');
  const d   = document.createElement('div');
  d.className = 'le l'+cls;
  d.textContent = msg;
  box.prepend(d);
  while (box.children.length > 30) box.removeChild(box.lastChild);
}

// ============================================
// EKRANI GÜNCELLE
// ============================================
function guncelle() {
  const p = oyun.oyuncu;

  // Üst bar
  document.getElementById('sv-lvl').textContent   = p.lvl;
  document.getElementById('sv-gold').textContent  = p.altin;
  document.getElementById('sv-kills').textContent = p.kills;
  document.getElementById('sv-steps').textContent = p.steps;
  document.getElementById('sv-xp').textContent    = p.xp + '/' + p.xpLimit;
  document.getElementById('xp-bar').style.width   = Math.min(100, p.xp / p.xpLimit * 100) + '%';

  // Can barı
  const hpPct = Math.max(0, p.hp / p.maxHp * 100);
  document.getElementById('hp-txt').textContent  = p.hp + '/' + p.maxHp;
  document.getElementById('hp-bar').style.width  = hpPct + '%';
  document.getElementById('hp-bar').style.background =
    hpPct > 60 ? '#30b050' : hpPct > 30 ? '#d08020' : '#c03030';

  // Can yenileme notu
  const rn = document.getElementById('regen-note');
  if (p.hp >= p.maxHp) {
    rn.textContent = '✅ Can tam dolu!';
    rn.style.color = '#f0c040';
  } else {
    rn.textContent = '♻ Her 3sn +1 can yenileniyor...';
    rn.style.color = '#50c870';
  }

  // Güç & zırh
  document.getElementById('atk-txt').textContent = p.atk;
  document.getElementById('def-txt').textContent = p.def;
  document.getElementById('atk-bar').style.width = Math.min(100, p.atk/20*100) + '%';
  document.getElementById('def-bar').style.width = Math.min(100, p.def/15*100) + '%';

  // Harita
  const mapEl = document.getElementById('map');
  mapEl.style.gridTemplateColumns = `repeat(${BOYUT}, var(--cell))`;
  mapEl.innerHTML = '';

  for (let r = 0; r < BOYUT; r++) {
    for (let c = 0; c < BOYUT; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const h = oyun.grid[r][c];
      const isP = (r===p.r && c===p.c);

      if (isP) {
        cell.classList.add('player');
        const s = document.createElement('span'); s.className='ci'; s.textContent='🏴‍☠️'; cell.appendChild(s);
      } else if (!h.gorundu) {
        cell.classList.add('fog');
        const s = document.createElement('span'); s.className='ci'; s.textContent='🌊'; s.style.fontSize='16px'; cell.appendChild(s);
      } else {
        cell.classList.add('visited');
        let ikon = '·';
        if ((h.tip==='dusman'||h.tip==='patron') && h.npc) ikon = h.npc.ikon;
        else if (h.tip==='dost' && h.npc)                  ikon = h.npc.ikon;
        else if (h.tip==='hazine')                          ikon = h.ikon || '💎';
        const s = document.createElement('span'); s.className='ci pop'; s.textContent=ikon;
        if (ikon==='·') { s.style.opacity='.15'; s.style.fontSize='12px'; }
        cell.appendChild(s);
      }
      mapEl.appendChild(cell);
    }
  }

  // Butonlar
  ['bu','bd','bl','br'].forEach(id => {
    document.getElementById(id).disabled = oyun.bitti || muharebe !== null;
  });

  // NPC listesi
  const npcList = document.getElementById('npc-list');
  npcList.innerHTML = '';
  const aktif = [];
  for (let r=0;r<BOYUT;r++) for (let c=0;c<BOYUT;c++) {
    const h = oyun.grid[r][c];
    if ((h.tip==='dusman'||h.tip==='patron') && h.npc) aktif.push(h.npc);
  }
  aktif.slice(0,5).forEach(n => {
    const row = document.createElement('div'); row.className='npc-row';
    row.innerHTML = `<span class="npc-icon">${n.ikon}</span>
      <div class="npc-info"><div class="npc-name" style="color:${n.renk}">${n.ad}</div>
      <div class="npc-type">${n.desc||''}</div></div>
      <div class="npc-hp">❤ ${n.curHp}/${n.hp}</div>`;
    npcList.appendChild(row);
  });

  // Savaş ekranı güncelleme (açıksa)
  if (muharebe) {
    const pb = Math.max(0, p.hp/p.maxHp*100);
    document.getElementById('cb-player-bar').style.width = pb + '%';
    document.getElementById('cb-player-hp').textContent  = p.hp+'/'+p.maxHp;
  }
}

// ============================================
// HAREKET
// ============================================
function hareket(dr, dc) {
  if (oyun.bitti || muharebe) return;
  const p = oyun.oyuncu;
  const nr = p.r+dr, nc = p.c+dc;

  if (nr<0||nr>=BOYUT||nc<0||nc>=BOYUT) {
    ses('sinir');
    const mw = document.getElementById('map-wrap');
    mw.classList.add('shk');
    setTimeout(() => mw.classList.remove('shk'), 350);
    return;
  }

  p.r=nr; p.c=nc; p.steps++;
  oyun.grid[nr][nc].gorundu = true;
  acKomsu(nr, nc);
  ses('adim');

  const h = oyun.grid[nr][nc];

  if (h.tip==='dusman'||h.tip==='patron') {
    if (h.npc) baslaCombat(h.npc, nr, nc);
  } else if (h.tip==='dost' && h.npc) {
    const msg   = h.npc.mesajlar[rnd(0, h.npc.mesajlar.length-1)];
    const altin = h.npc.odul || rnd(8,20);
    p.altin += altin;
    log(`💬 ${h.npc.ad}: "${msg}"`, 'n');
    log(`💰 +${altin} altın kazandın!`, 'g');
    ses('altin');
    h.tip='bos'; h.npc=null;
  } else if (h.tip==='hazine') {
    const altin = rnd(20, 65);
    p.altin += altin;
    log(`💎 Hazine bulundu: +${altin} altın!`, 'g');
    ses('altin');
    h.tip='bos';
  } else {
    const msgs=['Dalgalar çırpınıyor...','Deniz sakin.','Rüzgar esiyor.','Ufuk uzak.','Güverte ıslak.','Tuz kokusu var.'];
    log(msgs[rnd(0, msgs.length-1)], 'i');
  }

  guncelle();
}

// ============================================
// SAVAŞ
// ============================================
function baslaCombat(npc, gr, gc) {
  muharebe = { npc, gr, gc };
  const p = oyun.oyuncu;

  document.getElementById('cb-scene').textContent      = npc.ikon;
  document.getElementById('cb-enemy-name').textContent = npc.ad;
  document.getElementById('cb-player-hp').textContent  = p.hp+'/'+p.maxHp;
  document.getElementById('cb-player-bar').style.width = (p.hp/p.maxHp*100)+'%';
  guncelleEnemyBar();

  document.getElementById('cb-msg').textContent = `${npc.ad} önünde duruyor! Ne yapacaksın?`;
  document.getElementById('act-skill').disabled = p.skilCd > 0;
  document.getElementById('cd-info').textContent = p.skilCd > 0 ? `✨ Özel: ${p.skilCd} tur bekleme` : '';
  document.getElementById('combat-overlay').style.display = 'flex';
  guncelle();
}

function guncelleEnemyBar() {
  const npc = muharebe.npc;
  const pct = Math.max(0, npc.curHp / npc.hp * 100);
  document.getElementById('cb-enemy-bar').style.width = pct + '%';
  document.getElementById('cb-hp-lbl').textContent    = Math.max(0,npc.curHp)+'/'+npc.hp;
}

function combatAksiyon(tip) {
  const p   = oyun.oyuncu;
  const npc = muharebe.npc;
  let msg   = '';

  if (tip==='atk') {
    const pAtk  = rnd(Math.max(1,p.atk-2), p.atk+3);
    const hasar = Math.max(1, pAtk - (npc.def||0));
    npc.curHp  -= hasar;
    ses('atk');
    msg = `⚔ Kılıcınla ${hasar} hasar verdin!`;
  } else if (tip==='skill') {
    if (p.skilCd > 0) return;
    const hasar = Math.max(3, p.atk*2 - (npc.def||0));
    npc.curHp  -= hasar;
    p.skilCd    = 3;
    ses('kazan');
    msg = `✨ TOPÇU ATIŞI! ${hasar} büyük hasar!`;
  } else if (tip==='kac') {
    if (Math.random() < 0.5) {
      muharebe = null;
      document.getElementById('combat-overlay').style.display = 'none';
      log('🌊 Kaçmayı başardın!', 'i');
      ses('kac');
      guncelle();
      return;
    } else {
      msg = '🌊 Kaçmaya çalıştın ama başaramadın!';
      ses('sinir');
    }
  }

  // Düşman öldü mü?
  if (npc.curHp <= 0) {
    const odul = npc.odul||0, xp = npc.xp||0;
    p.altin += odul; p.xp += xp; p.kills++;
    ses('kazan');
    log(`⚔ ${npc.ad} yenildi! +${odul}💰 +${xp}xp`, 'g');
    oyun.grid[muharebe.gr][muharebe.gc].tip = 'bos';
    oyun.grid[muharebe.gr][muharebe.gc].npc = null;

    if (npc.tip==='patron') {
      oyun.bitti=true; oyun.kazandi=true;
      muharebe=null;
      document.getElementById('combat-overlay').style.display='none';
      clearInterval(regenTimer);
      setTimeout(() => gosterBitis(true), 400);
      guncelle(); return;
    }

    seviyeKontrol();
    muharebe=null;
    document.getElementById('combat-overlay').style.display='none';
    guncelle(); return;
  }

  // Düşman saldırır
  const dAtk  = rnd(Math.max(1,npc.atk-2), npc.atk+2);
  const dHasar = Math.max(1, dAtk - p.def);
  p.hp -= dHasar;
  if (p.hp < 0) p.hp = 0;
  ses('hasar');
  msg += ` | ${npc.ad} sana ${dHasar} hasar verdi!`;

  document.getElementById('cb-msg').textContent = msg;
  guncelleEnemyBar();

  // Özel bekleme azalt
  if (p.skilCd > 0) p.skilCd--;
  document.getElementById('act-skill').disabled = p.skilCd > 0;
  document.getElementById('cd-info').textContent = p.skilCd > 0 ? `✨ Özel: ${p.skilCd} tur bekleme` : '✨ Özel saldırı hazır!';

  // Oyuncu öldü mü?
  if (p.hp <= 0) {
    oyun.bitti=true; muharebe=null;
    document.getElementById('combat-overlay').style.display='none';
    clearInterval(regenTimer);
    ses('oldu');
    setTimeout(() => gosterBitis(false), 500);
  }

  guncelle();
}

function seviyeKontrol() {
  const p = oyun.oyuncu;
  if (p.xp >= p.xpLimit) {
    p.lvl++;
    p.xp      -= p.xpLimit;
    p.xpLimit  = Math.floor(p.xpLimit * 1.6);
    p.maxHp   += 8;
    p.hp       = Math.min(p.hp+12, p.maxHp);
    p.atk     += 2;
    p.def     += 1;
    ses('kazan');
    log(`🌟 SEVİYE ${p.lvl}! MaxCan+8, Güç+2, Zırh+1`, 'w');
  }
}

function gosterBitis(kazandi) {
  const p = oyun.oyuncu;
  document.getElementById('over-icon').textContent  = kazandi ? '🏆' : '💀';
  document.getElementById('over-title').textContent = kazandi ? 'ZAFER!' : 'YENİLGİ';
  document.getElementById('over-msg').textContent   = kazandi
    ? `Korsan Gemisini battırdın! ${p.kills} düşman yenildi, ${p.altin} altın kazanıldı. Yedi denizin efendisi sensin!`
    : `${p.steps} adım attın, ${p.kills} düşman yenildi. Deniz seni yuttu... Tekrar dene!`;
  document.getElementById('over-overlay').style.display = 'flex';
}

// ============================================
// ANİMASYONLU DENİZ ARKA PLANI (Canvas)
// ============================================
function seaAnimation() {
  const canvas = document.getElementById('sea-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, t = 0;

  // Baloncuklar
  const bubbles = Array.from({length:28}, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random()*3 + 1,
    spd: Math.random()*0.0003 + 0.0001,
    a: Math.random()*0.4 + 0.1
  }));

  // Dalgalar (sinüs çizgisi grupları)
  const dalgalar = Array.from({length:6}, (_, i) => ({
    y:  0.15 + i*0.14,
    amp: 8  + i*4,
    frq: 0.008 + i*0.002,
    spd: 0.0008 + i*0.0003,
    alpha: 0.06 - i*0.008
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Arka plan gradyanı
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,   '#060e1a');
    grad.addColorStop(0.5, '#08152a');
    grad.addColorStop(1,   '#0a1830');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Yıldızlar (tepede)
    ctx.fillStyle = '#ffffff';
    for (let i=0;i<60;i++) {
      const sx = ((i*137+50)%100)/100 * W;
      const sy = ((i*91+20)%40)/100  * H;
      const sa = 0.3 + 0.3*Math.sin(t*0.8+i);
      ctx.globalAlpha = sa;
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Ay
    ctx.save();
    ctx.globalAlpha = 0.55;
    const moonX = W * 0.82, moonY = H * 0.1;
    const moonGrad = ctx.createRadialGradient(moonX,moonY,2,moonX,moonY,22);
    moonGrad.addColorStop(0,'#fffde0');
    moonGrad.addColorStop(1,'transparent');
    ctx.fillStyle = moonGrad;
    ctx.beginPath(); ctx.arc(moonX, moonY, 22, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Ay yansıması
    ctx.save();
    ctx.globalAlpha = 0.06 + 0.03*Math.sin(t*0.5);
    ctx.fillStyle = '#f0e070';
    for (let i=0;i<5;i++) {
      const rx = moonX - 4 + i*2;
      const ry1 = H*0.42, ry2 = H*0.95;
      ctx.fillRect(rx, ry1, 1, ry2-ry1);
    }
    ctx.restore();

    // Dalga çizgileri
    dalgalar.forEach(d => {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.strokeStyle = '#4488cc';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      for (let x=0; x<=W; x+=4) {
        const y = d.y*H + Math.sin(x*d.frq + t*d.spd*3000)*d.amp;
        x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Baloncuklar
    bubbles.forEach(b => {
      b.y -= b.spd;
      if (b.y < 0) { b.y = 1; b.x = Math.random(); }
      ctx.save();
      ctx.globalAlpha = b.a * Math.abs(Math.sin(t*0.3+b.x*10));
      ctx.strokeStyle = '#6699cc';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(b.x*W, b.y*H, b.r, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    });

    // Deniz köpüğü (alt)
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#88aaee';
    for (let i=0;i<8;i++) {
      const fx  = (Math.sin(t*0.0002*i*0.7+i)*0.5+0.5)*W;
      const fy  = H * (0.6 + 0.4*(i%3)/3);
      const fr  = 30 + i*10;
      const fg  = ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
      fg.addColorStop(0,'#88aaee'); fg.addColorStop(1,'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fx,fy,fr,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    t++;
    requestAnimationFrame(draw);
  }
  draw();
}

// ============================================
// TOOLTIP SİSTEMİ
// ============================================
function tooltipBaslat() {
  const tip = document.getElementById('tooltip');

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.classList.remove('show'); return; }
    tip.textContent = el.dataset.tip;
    tip.classList.add('show');
  });

  document.addEventListener('mousemove', e => {
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top  = (e.clientY + 14) + 'px';
    // Sağa taşma önle
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth - 10)
      tip.style.left = (e.clientX - rect.width - 14) + 'px';
  });

  document.addEventListener('mouseout', e => {
    if (!e.target.closest('[data-tip]')) tip.classList.remove('show');
  });
}

// ============================================
// EVENT LISTENERS
// ============================================
document.getElementById('bu').addEventListener('click', ()=>hareket(-1, 0));
document.getElementById('bd').addEventListener('click', ()=>hareket( 1, 0));
document.getElementById('bl').addEventListener('click', ()=>hareket( 0,-1));
document.getElementById('br').addEventListener('click', ()=>hareket( 0, 1));
document.getElementById('newbtn').addEventListener('click', yeniOyun);
document.getElementById('over-btn').addEventListener('click', yeniOyun);
document.getElementById('act-atk').addEventListener('click',   ()=>combatAksiyon('atk'));
document.getElementById('act-skill').addEventListener('click', ()=>combatAksiyon('skill'));
document.getElementById('act-flee').addEventListener('click',  ()=>combatAksiyon('kac'));

// Klavye
document.addEventListener('keydown', e => {
  if      (['w','W','ArrowUp'].includes(e.key))    { e.preventDefault(); hareket(-1, 0); }
  else if (['s','S','ArrowDown'].includes(e.key))  { e.preventDefault(); hareket( 1, 0); }
  else if (['a','A','ArrowLeft'].includes(e.key))  { e.preventDefault(); hareket( 0,-1); }
  else if (['d','D','ArrowRight'].includes(e.key)) { e.preventDefault(); hareket( 0, 1); }
});

// Müzik butonu
document.getElementById('muzik-btn').addEventListener('click', () => {
  muzikAcik = !muzikAcik;
  const btn = document.getElementById('muzik-btn');
  if (muzikAcik) {
    btn.classList.remove('kapali');
    muzikBaslat();
    log('🎵 Müzik açıldı.','i');
  } else {
    btn.classList.add('kapali');
    muzikDurdur();
    log('🔇 Müzik kapatıldı.','i');
  }
});

// Ses butonu
document.getElementById('ses-btn').addEventListener('click', () => {
  sesAcik = !sesAcik;
  document.getElementById('ses-btn').classList.toggle('kapali', !sesAcik);
  log(sesAcik ? '🔊 Ses efektleri açık.' : '🔇 Ses efektleri kapalı.', 'i');
});

// ============================================
// BAŞLAT
// ============================================
seaAnimation();
tooltipBaslat();
yeniOyun();
