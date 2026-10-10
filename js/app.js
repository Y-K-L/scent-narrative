/* =========================================================
   气味叙事 · 交互逻辑
   依赖 data.js（先于本文件加载）
   ========================================================= */
(function () {
  'use strict';

  const {
    SCENTS, TYPE_LABEL, LAYER_COLOR, MOODS,
    HOT_RECIPES, WALL, STORAGE_KEY
  } = window;

  /* ---------- 工具 ---------- */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = s => String(s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));

  /* ---------- 路由 ---------- */
  const VIEWS = ['home', 'workshop', 'recipes'];

  function route () {
    let hash = (location.hash.replace('#', '').replace('/', '') || 'home');
    if (hash.indexOf('kit') === 0) hash = 'home';
    if (VIEWS.indexOf(hash) === -1) hash = 'home';

    VIEWS.forEach(v => {
      $('#view-' + v).classList.toggle('active', v === hash);
    });
    $$('#navLinks a').forEach(a => {
      a.classList.toggle('active', a.dataset.view === hash);
    });

    if (hash === 'recipes') renderMyRecipes();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* =========================================================
     首页
     ========================================================= */
  function renderHome () {
    const grid = $('#hotRecipes');
    grid.innerHTML = HOT_RECIPES.map((r, i) => {
      const notes = ['top', 'mid', 'base']
        .map(t => r.notes[t].map(n => n[0]).join(' · '))
        .join(' · ');
      return `
        <div class="recipe-tile" data-index="${i}">
          <h3>《${esc(r.name)}》</h3>
          <div class="notes">${esc(notes)}</div>
          <div class="story">${esc(r.story)}</div>
        </div>`;
    }).join('');

    grid.addEventListener('click', e => {
      const tile = e.target.closest('.recipe-tile');
      if (!tile) return;
      loadHotRecipe(HOT_RECIPES[+tile.dataset.index]);
    });

    $('#recipeWall').innerHTML = WALL.map(([name, code]) => `
      <div class="wall-chip">《${esc(name)}》<small>No. ${code}</small></div>
    `).join('');
  }

  /* =========================================================
     调香工坊
     ========================================================= */
  const state = {
    mood: '',
    currentTab: 'top',
    selected: [],
    conc: 'EDT 12%'
  };

  function renderMoods () {
    $('#moods').innerHTML = MOODS.map(m => `
      <button class="mood ${state.mood === m ? 'active' : ''}"
              data-mood="${esc(m)}">${esc(m)}</button>
    `).join('');
  }

  function renderScents () {
    const picked = state.selected.map(s => s.id);
    $('#scents').innerHTML = SCENTS[state.currentTab].map(s => {
      const active = picked.indexOf(s.id) > -1;
      return `
        <div class="scent ${active ? 'active' : ''}" data-id="${s.id}">
          <div class="scent-name">
            <span class="dot" style="background:${s.color}"></span>${esc(s.name)}
          </div>
          <div class="scent-desc">${esc(s.desc)}</div>
        </div>`;
    }).join('');
  }

  function toggleScent (id, type) {
    const i = state.selected.findIndex(s => s.id === id);
    if (i > -1) {
      state.selected.splice(i, 1);
    } else {
      const base = SCENTS[type].find(s => s.id === id);
      if (!base) return;
      state.selected.push(Object.assign({}, base, { type: type, value: 30 }));
    }
    renderScents();
    renderFormula();
    updateStep();
  }

  function renderFormula () {
    const area = $('#formulaArea');

    if (state.selected.length === 0) {
      area.innerHTML = `
        <div class="empty-tip">
          还没有选香材<br>
          去上面挑几支，开始你的气味叙事
        </div>`;
      recalc();
      return;
    }

    const groups = { top: [], mid: [], base: [] };
    state.selected.forEach(s => groups[s.type].push(s));

    let html = '';
    ['top', 'mid', 'base'].forEach(type => {
      if (groups[type].length === 0) return;
      html += `<div class="group-label">${TYPE_LABEL[type]}</div>`;
      groups[type].forEach(s => {
        html += `
          <div class="slider-row">
            <span class="name">${esc(s.name)}</span>
            <input type="range" min="5" max="100" value="${s.value}"
                   data-id="${s.id}" data-type="${s.type}">
            <span class="pct" data-pct="${s.id}">--</span>
          </div>`;
      });
    });
    area.innerHTML = html;

    $$('#formulaArea input[type=range]').forEach(input => {
      input.addEventListener('input', () => {
        const item = state.selected.find(s => s.id === input.dataset.id);
        if (item) item.value = +input.value;
        recalc();
      });
    });

    recalc();
  }

  function recalc () {
    const list = state.selected;

    if (list.length === 0) {
      $$('#formulaArea [data-pct]').forEach(el => el.textContent = '0%');
      setPyramid({ top: 0, mid: 0, base: 0 });
      setBottle({ top: 0, mid: 0, base: 0 });
      return;
    }

    const total = list.reduce((a, b) => a + b.value, 0) || 1;
    const pyramid = { top: 0, mid: 0, base: 0 };

    list.forEach(s => {
      const pct = Math.round(s.value / total * 100);
      s._pct = pct;
      pyramid[s.type] += pct;
      const el = $(`#formulaArea [data-pct="${s.id}"]`);
      if (el) el.textContent = pct + '%';
    });

    setPyramid(pyramid);
    setBottle(pyramid);
  }

  function setPyramid (p) {
    [
      ['#pyTop',  '前调', p.top],
      ['#pyMid',  '中调', p.mid],
      ['#pyBase', '后调', p.base]
    ].forEach(([sel, label, val]) => {
      const el = $(sel);
      el.style.width = Math.max(val, 12) + '%';
      el.textContent = label + ' ' + val + '%';
    });
  }

  function setBottle (p) {
    $('#bottle').innerHTML = ['top', 'mid', 'base']
      .filter(t => p[t] > 0)
      .map(t => `<i style="height:${p[t]}%;background:${LAYER_COLOR[t]}"></i>`)
      .join('');
  }

  function updateStep () {
    let step = 1;
    if (state.mood) step = 2;
    if (state.selected.length > 0) step = 3;
    $('#stepIndicator').textContent = `第 ${step} 步 / 共 3 步`;
    $('#genBtn').disabled = state.selected.length === 0;
  }

  /* ---------- 生成配方卡 ---------- */
  let currentCard = null;

  function generateCard () {
    if (state.selected.length === 0) {
      alert('请先选择香材');
      return;
    }

    const name = ($('#recipeName').value || '').trim() || '未命名';
    const code = 'No. ' + (Math.floor(Math.random() * 9000) + 1000);

    const groups = { top: [], mid: [], base: [] };
    state.selected.forEach(s => {
      groups[s.type].push({ name: s.name, pct: s._pct || 0 });
    });

    const rows = ['top', 'mid', 'base']
      .filter(t => groups[t].length > 0)
      .map(t => ({
        label: TYPE_LABEL[t],
        text: groups[t].map(s => `${s.name} ${s.pct}%`).join(' · ')
      }));

    const pyramid = { top: 0, mid: 0, base: 0 };
    state.selected.forEach(s => pyramid[s.type] += (s._pct || 0));

    let lead = '中调主导，性格鲜明';
    if (pyramid.top >= pyramid.mid && pyramid.top >= pyramid.base) {
      lead = '前调主导，第一印象明亮';
    } else if (pyramid.base >= pyramid.mid) {
      lead = '后调主导，余温绵长';
    }

    const meta = ['浓度 ' + state.conc, '基底 酒精', '静置 7 天', lead];
    if (state.mood) meta.push('情绪 ' + state.mood);

    currentCard = {
      id: 'r' + Date.now(),
      code: code,
      name: name,
      mood: state.mood,
      conc: state.conc,
      groups: groups,
      rows: rows,
      meta: meta,
      createdAt: new Date().toISOString()
    };

    renderCard(currentCard);
  }

  function renderCard (card) {
    $('#cardCode').textContent = card.code;
    $('#cardName').textContent = `《${card.name}》`;
    $('#cardRows').innerHTML = card.rows.map(r => `
      <div class="row"><b>${r.label}</b><span>${esc(r.text)}</span></div>
    `).join('');
    $('#cardMeta').innerHTML = card.meta.map(m =>
      `<span>${esc(m)}</span>`).join('');

    const el = $('#card');
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 载入热门配方 ---------- */
  function loadHotRecipe (r) {
    state.selected = [];
    state.mood = r.mood || '';
    state.currentTab = 'top';

    ['top', 'mid', 'base'].forEach(type => {
      (r.notes[type] || []).forEach(([name, pct]) => {
        const base = SCENTS[type].find(s => s.name === name);
        if (base) state.selected.push(Object.assign({}, base, { type: type, value: pct }));
      });
    });

    $('#recipeName').value = r.name;
    location.hash = '#/workshop';

    setTimeout(() => {
      renderMoods();
      $$('#tabs .tab').forEach(t =>
        t.classList.toggle('active', t.dataset.type === state.currentTab));
      renderScents();
      renderFormula();
      updateStep();
    }, 50);
  }

  /* =========================================================
     我的配方
     ========================================================= */
  function loadRecipes () {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveRecipes (list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function renderMyRecipes () {
    const area = $('#myRecipesArea');
    const list = loadRecipes();

    if (list.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <p>还没有保存的配方</p>
          <a href="#/workshop" class="btn">去调一支</a>
        </div>`;
      return;
    }

    area.innerHTML = '<div class="my-recipes">' + list.map(r => `
      <div class="mini-card" data-id="${r.id}">
        <button class="del" data-del="${r.id}">删除</button>
        <div class="code">${esc(r.code)}</div>
        <h4>《${esc(r.name)}》</h4>
        ${r.rows.map(row => `
          <div class="row"><b>${row.label}</b>${esc(row.text)}</div>
        `).join('')}
        <div class="meta">
          ${r.meta.map(m => `<span>${esc(m)}</span>`).join('')}
        </div>
      </div>
    `).join('') + '</div>';

    area.onclick = e => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const id = del.dataset.del;
      if (!confirm('确定删除这个配方吗？')) return;
      saveRecipes(loadRecipes().filter(r => r.id !== id));
      renderMyRecipes();
    };
  }

  /* =========================================================
     绑定事件
     ========================================================= */
  function bindEvents () {
    /* 情绪 */
    $('#moods').addEventListener('click', e => {
      const btn = e.target.closest('.mood');
      if (!btn) return;
      state.mood = state.mood === btn.dataset.mood ? '' : btn.dataset.mood;
      renderMoods();
      updateStep();
    });

    /* Tabs */
    $('#tabs').addEventListener('click', e => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      state.currentTab = tab.dataset.type;
      $$('#tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
      renderScents();
    });

    /* 香材 */
    $('#scents').addEventListener('click', e => {
      const el = e.target.closest('.scent');
      if (!el) return;
      toggleScent(el.dataset.id, state.currentTab);
    });

    /* 浓度 */
    $('#conc').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      state.conc = btn.dataset.v;
      $$('#conc button').forEach(b => b.classList.toggle('active', b === btn));
    });

    /* 生成配方卡 */
    $('#genBtn').addEventListener('click', generateCard);

    /* 保存 */
    $('#saveBtn').addEventListener('click', () => {
      if (!currentCard) return;
      const list = loadRecipes();
      if (list.some(r => r.code === currentCard.code)) {
        alert('这个配方已经保存过了');
        return;
      }
      list.unshift(currentCard);
      saveRecipes(list);
      alert('已保存到「我的配方」');
    });

    /* 加购 */
    $('#cartBtn').addEventListener('click', () => {
      if (!currentCard) return;
      alert(
        '已加入购物车\n\n' +
        '配方：《' + currentCard.name + '》\n' +
        currentCard.code + '\n\n' +
        '我们会按你的配方代调成品，7 天内发货。'
      );
    });
  }

  /* =========================================================
     启动
     ========================================================= */
  function init () {
    renderHome();
    renderMoods();
    renderScents();
    renderFormula();
    updateStep();
    bindEvents();
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
