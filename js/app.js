/* =========================================================
   气味叙事 · 页面逻辑
   依赖 data.js + store.js（先于本文件加载）
   ========================================================= */
(function () {
  'use strict';

  const {
    SCENTS, TYPE_LABEL, LAYER_COLOR, MOODS,
    HOT_RECIPES, WALL, PRICE
  } = window;
  const { Auth, Recipes, Addresses, Orders, Users, uid } = window.Store;

  /* ---------- 工具 ---------- */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  /* =========================================================
     路由
     ========================================================= */
  const VIEWS = ['home', 'workshop', 'login', 'recipes', 'orders', 'address', 'admin'];
  const AUTH_REQUIRED = {
    recipes: 'user',
    orders:  'user',
    address: 'user',
    admin:   'admin'
  };

  function route() {
    let hash = (location.hash.replace('#', '').replace('/', '') || 'home');
    if (hash.indexOf('kit') === 0) hash = 'home';
    if (VIEWS.indexOf(hash) === -1) hash = 'home';

    /* --- 权限守卫 --- */
    const need = AUTH_REQUIRED[hash];
    if (need) {
      const u = Auth.currentUser();
      if (!u) {
        location.hash = '#/login';
        return;
      }
      if (need === 'admin' && u.role !== 'admin') {
        location.hash = '#/';
        alert('需要管理员权限');
        return;
      }
    }

    /* --- 切换视图 --- */
    VIEWS.forEach(v => {
      const el = $('#view-' + v);
      if (el) el.classList.toggle('active', v === hash);
    });
    $$('#navLinks a').forEach(a => {
      a.classList.toggle('active', a.dataset.view === hash);
    });

    /* --- 按需渲染 --- */
    if (hash === 'recipes') renderMyRecipes();
    if (hash === 'orders')  renderMyOrders();
    if (hash === 'address') renderMyAddresses();
    if (hash === 'admin')   renderAdmin();
    if (hash === 'login')   resetAuthForm();

    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* =========================================================
     导航栏
     ========================================================= */
  function renderNavUser() {
    const u = Auth.currentUser();
    const el = $('#navUser');

    if (!u) {
      el.innerHTML = '<a href="#/login" class="btn small">登录 / 注册</a>';
    } else {
      el.innerHTML = `
        <span class="user-chip">
          <b>${esc(u.nickname)}</b>
          ${u.role === 'admin' ? '<span class="role">管理员</span>' : ''}
        </span>
        <button class="link-btn" id="logoutBtn" type="button">退出</button>
      `;
      $('#logoutBtn').addEventListener('click', () => {
        Auth.logout();
        renderNavUser();
        renderNavLinks();
        location.hash = '#/';
      });
    }
  }

  function renderNavLinks() {
    const u = Auth.currentUser();
    $$('#navLinks a').forEach(a => {
      const need = a.dataset.auth;
      if (!need) { a.style.display = ''; return; }

      // 管理员入口：仅管理员可见
      if (need === 'admin') {
        a.style.display = (u && u.role === 'admin') ? '' : 'none';
        return;
      }

      // 用户入口：管理员登录时隐藏，未登录时保留（点击会跳到登录页）
      if (u && u.role === 'admin') {
        a.style.display = 'none';
      } else {
        a.style.display = '';
      }
    });
  }

  /* =========================================================
     首页
     ========================================================= */
  function renderHome() {
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

  function renderMoods() {
    $('#moods').innerHTML = MOODS.map(m => `
      <button class="mood ${state.mood === m ? 'active' : ''}"
              data-mood="${esc(m)}" type="button">${esc(m)}</button>
    `).join('');
  }

  function renderScents() {
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

  function toggleScent(id, type) {
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

  function renderFormula() {
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

  function recalc() {
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

  function setPyramid(p) {
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

  function setBottle(p) {
    $('#bottle').innerHTML = ['top', 'mid', 'base']
      .filter(t => p[t] > 0)
      .map(t => `<i style="height:${p[t]}%;background:${LAYER_COLOR[t]}"></i>`)
      .join('');
  }

  function updateStep() {
    let step = 1;
    if (state.mood) step = 2;
    if (state.selected.length > 0) step = 3;
    $('#stepIndicator').textContent = `第 ${step} 步 / 共 3 步`;
    $('#genBtn').disabled = state.selected.length === 0;
  }

  /* ---------- 生成配方卡 ---------- */
  let currentCard = null;

  function generateCard() {
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
      id: uid('r'),
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

  function renderCard(card) {
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
  function loadHotRecipe(r) {
    state.selected = [];
    state.mood = r.mood || '';
    state.currentTab = 'top';

    ['top', 'mid', 'base'].forEach(type => {
      (r.notes[type] || []).forEach(([name, pct]) => {
        const base = SCENTS[type].find(s => s.name === name);
        if (base) {
          state.selected.push(Object.assign({}, base, { type: type, value: pct }));
        }
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
    }, 60);
  }

  /* =========================================================
     登录 / 注册
     ========================================================= */
  let authMode = 'login';   // 'login' | 'register'
  let authRole = 'user';    // 'user' | 'admin'

  function resetAuthForm() {
    authMode = 'login';
    authRole = 'user';
    const form = $('#authForm');
    if (form) form.reset();
    $$('.auth-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.role === 'user'));
    hideAuthMsg();
    updateAuthUI();
  }

  function updateAuthUI() {
    const isRegister = authMode === 'register';
    const isAdmin = authRole === 'admin';

    $('#nicknameRow').style.display = isRegister ? '' : 'none';
    $('#authSubmit').textContent = isRegister ? '注册并登录' : '登录';

    $('#authSwitch').style.display = isAdmin ? 'none' : '';
    $('#authSwitch').innerHTML = isRegister
      ? '已有账号？<button type="button" id="goLogin">返回登录</button>'
      : '还没有账号？<button type="button" id="goRegister">注册用户账号</button>';

    const btn = isRegister
      ? $('#goLogin')
      : $('#goRegister');
    if (btn) {
      btn.onclick = () => {
        authMode = isRegister ? 'login' : 'register';
        hideAuthMsg();
        updateAuthUI();
      };
    }

    $('#authHint').innerHTML = isAdmin
      ? '管理员演示账号：<b>admin</b> / admin123'
      : '演示账号 · 用户：<b>user</b> / user123 &nbsp;|&nbsp; 管理员：<b>admin</b> / admin123';
  }

  function showAuthMsg(msg) {
    const el = $('#authMsg');
    el.textContent = msg;
    el.classList.add('show');
  }
  function hideAuthMsg() {
    $('#authMsg').classList.remove('show');
  }

  function submitAuth(e) {
    e.preventDefault();
    hideAuthMsg();

    const username = $('#authUser').value;
    const password = $('#authPass').value;
    const nickname = $('#authNick').value;

    if (authMode === 'register') {
      const r = Auth.register(username, password, nickname);
      if (!r.ok) return showAuthMsg(r.msg);

      const lr = Auth.login(username, password, 'user');
      if (!lr.ok) return showAuthMsg(lr.msg);
      return authSuccess('注册成功，欢迎加入气味叙事');
    }

    const r = Auth.login(username, password, authRole);
    if (!r.ok) return showAuthMsg(r.msg);
    authSuccess('登录成功');
  }

  function authSuccess(msg) {
    renderNavUser();
    renderNavLinks();

    const u = Auth.currentUser();
    const back = sessionStorage.getItem('sn_redirect');
    sessionStorage.removeItem('sn_redirect');

    if (msg) {
      // 简单提示
      setTimeout(() => alert(msg), 60);
    }

    if (back) {
      location.hash = back;
    } else {
      location.hash = (u && u.role === 'admin') ? '#/admin' : '#/workshop';
    }
  }

  /* =========================================================
     我的配方
     ========================================================= */
  function renderMyRecipes() {
    const u = Auth.currentUser();
    const area = $('#myRecipesArea');
    if (!u) return;

    const list = Recipes.byUser(u.id);

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
        <div class="code">${esc(r.code)}</div>
        <h4>《${esc(r.name)}》</h4>
        ${r.rows.map(row => `
          <div class="row"><b>${row.label}</b>${esc(row.text)}</div>
        `).join('')}
        <div class="meta">
          ${r.meta.map(m => `<span>${esc(m)}</span>`).join('')}
        </div>
        <div class="actions">
          <button type="button" data-act="order" data-id="${r.id}">下单</button>
          <button type="button" data-act="del"   data-id="${r.id}">删除</button>
        </div>
      </div>
    `).join('') + '</div>';

    area.onclick = e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      const recipe = Recipes.byUser(u.id).find(r => r.id === id);
      if (!recipe) return;

      if (btn.dataset.act === 'del') {
        if (!confirm('确定删除这个配方吗？')) return;
        Recipes.remove(id, u.id);
        renderMyRecipes();
      }
      if (btn.dataset.act === 'order') {
        openOrderModal(recipe);
      }
    };
  }

  /* =========================================================
     我的订单
     ========================================================= */
  function orderStatusClass(s) {
    if (s === '已发货') return 'shipped';
    if (s === '已完成') return 'done';
    return '';
  }

  function renderMyOrders() {
    const u = Auth.currentUser();
    const area = $('#myOrdersArea');
    if (!u) return;

    const list = Orders.byUser(u.id);

    if (list.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <p>还没有订单</p>
          <a href="#/workshop" class="btn">去调一支</a>
        </div>`;
      return;
    }

    area.innerHTML = list.map(o => `
      <div class="order-card">
        <div class="order-head">
          <div class="order-code">订单号 ${esc(o.id)} · ${fmtDate(o.createdAt)}</div>
          <div class="order-status ${orderStatusClass(o.status)}">${esc(o.status)}</div>
        </div>
        <div class="order-body">
          <div class="row"><b>配方</b>《${esc(o.recipe.name)}》 ${esc(o.recipe.code)}</div>
          ${o.recipe.rows.map(r => `
            <div class="row"><b>${r.label}</b>${esc(r.text)}</div>
          `).join('')}
          <div class="row"><b>收货</b>${esc(o.address.name)} ${esc(o.address.phone)}</div>
          <div class="row"><b>地址</b>${esc(o.address.full)}</div>
        </div>
        <div class="order-foot">
          <div class="order-amount">¥${o.amount}</div>
        </div>
      </div>
    `).join('');
  }

  /* =========================================================
     收货地址
     ========================================================= */
  function renderMyAddresses() {
    const u = Auth.currentUser();
    const area = $('#addressList');
    if (!u) return;

    const list = Addresses.byUser(u.id);

    if (list.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <p>还没有收货地址</p>
        </div>`;
      return;
    }

    area.innerHTML = list.map(a => `
      <div class="address-card ${a.isDefault ? 'default' : ''}">
        <div>
          <div class="name">
            ${esc(a.name)}
            <span>${esc(a.phone)}</span>
            ${a.isDefault ? '<span class="tag-default">默认</span>' : ''}
          </div>
          <div class="full">
            ${esc(a.province)} ${esc(a.city)} ${esc(a.district)} ${esc(a.detail)}
          </div>
        </div>
        <div class="actions">
          ${a.isDefault ? '' : `<button type="button" data-act="default" data-id="${a.id}">设为默认</button>`}
          <button type="button" data-act="del" data-id="${a.id}">删除</button>
        </div>
      </div>
    `).join('');

    area.onclick = e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;

      if (btn.dataset.act === 'del') {
        if (!confirm('确定删除这个地址吗？')) return;
        Addresses.remove(id, u.id);
        renderMyAddresses();
      }
      if (btn.dataset.act === 'default') {
        Addresses.setDefault(id, u.id);
        renderMyAddresses();
      }
    };
  }

  function submitAddress(e) {
    e.preventDefault();
    const u = Auth.currentUser();
    if (!u) return;

    const addr = {
      id: uid('a'),
      userId: u.id,
      name:     $('#addrName').value.trim(),
      phone:    $('#addrPhone').value.trim(),
      province: $('#addrProvince').value.trim(),
      city:     $('#addrCity').value.trim(),
      district: $('#addrDistrict').value.trim(),
      detail:   $('#addrDetail').value.trim(),
      isDefault: $('#addrDefault').checked,
      createdAt: new Date().toISOString()
    };

    if (!/^1\d{10}$/.test(addr.phone)) {
      alert('请填写正确的 11 位手机号');
      return;
    }

    Addresses.add(addr);
    $('#addressForm').reset();
    renderMyAddresses();
    alert('地址已保存');
  }

  /* =========================================================
     下单弹窗
     ========================================================= */
  function openModal(html) {
    $('#modalBox').innerHTML = html;
    $('#modalMask').classList.add('show');
  }
  function closeModal() {
    $('#modalMask').classList.remove('show');
    $('#modalBox').innerHTML = '';
  }

  function openOrderModal(recipe) {
    const u = Auth.currentUser();
    if (!u) {
      sessionStorage.setItem('sn_redirect', location.hash);
      location.hash = '#/login';
      return;
    }

    const addrs = Addresses.byUser(u.id);
    if (addrs.length === 0) {
      if (confirm('还没有收货地址，去添加吗？')) {
        location.hash = '#/address';
      }
      return;
    }

    const def = addrs.find(a => a.isDefault) || addrs[0];
    const addrHtml = addrs.map(a => `
      <label class="${a.id === def.id ? 'active' : ''}">
        <input type="radio" name="orderAddr" value="${a.id}"
               ${a.id === def.id ? 'checked' : ''}>
        <div>
          <div>
            <span class="nm">${esc(a.name)}</span>
            <span class="ph">${esc(a.phone)}</span>
            ${a.isDefault ? '<span class="tag-default">默认</span>' : ''}
          </div>
          <div class="full">${esc(a.province)} ${esc(a.city)} ${esc(a.district)} ${esc(a.detail)}</div>
        </div>
      </label>
    `).join('');

    openModal(`
      <h3>确认下单</h3>
      <div class="sub">我们按你的配方代调成品，7 天内发货。</div>

      <div class="panel-title">配方</div>
      <div style="font-size:14px;margin-bottom:6px;">
        《${esc(recipe.name)}》 <span style="color:var(--muted);font-size:12.5px;">${esc(recipe.code)}</span>
      </div>
      ${recipe.rows.map(r => `
        <div style="font-size:13px;color:var(--muted);margin-bottom:4px;">
          <b style="color:var(--ink);margin-right:8px;">${r.label}</b>${esc(r.text)}
        </div>
      `).join('')}

      <div class="panel-title" style="margin-top:24px;">收货地址</div>
      <div class="addr-pick" id="addrPick">${addrHtml}</div>

      <div class="order-foot" style="border-top:1px dashed var(--line);padding-top:16px;margin-top:0;">
        <span style="font-size:13.5px;color:var(--muted);">合计</span>
        <span class="order-amount">¥${PRICE}</span>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn ghost" id="cancelOrder">取消</button>
        <button type="button" class="btn" id="confirmOrder">确认下单</button>
      </div>
    `);

    // 地址选中高亮
    $('#addrPick').addEventListener('change', e => {
      if (e.target.name !== 'orderAddr') return;
      $$('#addrPick label').forEach(l => l.classList.remove('active'));
      e.target.closest('label').classList.add('active');
    });

    $('#cancelOrder').onclick = closeModal;

    $('#confirmOrder').onclick = () => {
      const picked = $('#addrPick input[name="orderAddr"]:checked');
      if (!picked) { alert('请选择收货地址'); return; }

      const addr = Addresses.byUser(u.id).find(a => a.id === picked.value);
      if (!addr) { alert('地址不存在'); return; }

      const order = {
        id: uid('o'),
        userId: u.id,
        recipeId: recipe.id || null,
        recipe: {
          code: recipe.code,
          name: recipe.name,
          rows: recipe.rows,
          meta: recipe.meta
        },
        amount: PRICE,
        status: '待处理',
        address: {
          name: addr.name,
          phone: addr.phone,
          full: `${addr.province} ${addr.city} ${addr.district} ${addr.detail}`
        },
        createdAt: new Date().toISOString()
      };

      Orders.add(order);
      closeModal();
      alert('下单成功，可在「我的订单」查看');
      location.hash = '#/orders';
    };
  }

  /* =========================================================
     管理后台
     ========================================================= */
  let adminTab = 'orders';

  function renderAdmin() {
    if (!Auth.isAdmin()) return;
    $$('#adminTabs .admin-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === adminTab);
    });
    const panel = $('#adminPanel');

    if (adminTab === 'orders')  return renderAdminOrders(panel);
    if (adminTab === 'recipes') return renderAdminRecipes(panel);
    if (adminTab === 'users')   return renderAdminUsers(panel);
  }

  /* ---- 订单 ---- */
  function renderAdminOrders(panel) {
    const list = Orders.all();

    if (list.length === 0) {
      panel.innerHTML = '<div class="admin-empty">暂无订单</div>';
      return;
    }

    panel.innerHTML = `
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>订单号</th>
              <th>用户</th>
              <th>配方</th>
              <th>收货人 / 地址</th>
              <th>金额</th>
              <th>状态</th>
              <th>下单时间</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(o => {
              const u = Users.byId(o.userId);
              const userName = u ? `${esc(u.nickname)}<br><span style="color:var(--muted);font-size:12px;">${esc(u.username)}</span>` : '—';
              return `
                <tr>
                  <td class="mono">${esc(o.id)}</td>
                  <td>${userName}</td>
                  <td>
                    《${esc(o.recipe.name)}》<br>
                    <span style="color:var(--muted);font-size:12px;">${esc(o.recipe.code)}</span>
                  </td>
                  <td>
                    ${esc(o.address.name)} ${esc(o.address.phone)}<br>
                    <span style="color:var(--muted);font-size:12.5px;">${esc(o.address.full)}</span>
                  </td>
                  <td>¥${o.amount}</td>
                  <td>
                    <select data-order-id="${o.id}" class="statusSelect">
                      ${['待处理','已发货','已完成']
                        .map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`)
                        .join('')}
                    </select>
                  </td>
                  <td class="mono">${fmtDate(o.createdAt)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    panel.querySelectorAll('.statusSelect').forEach(sel => {
      sel.addEventListener('change', () => {
        Orders.updateStatus(sel.dataset.orderId, sel.value);
      });
    });
  }

  /* ---- 配方 ---- */
  function renderAdminRecipes(panel) {
    const list = Recipes.all();

    if (list.length === 0) {
      panel.innerHTML = '<div class="admin-empty">暂无配方</div>';
      return;
    }

    panel.innerHTML = `
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>编号</th>
              <th>用户</th>
              <th>配方名</th>
              <th>香材</th>
              <th>情绪</th>
              <th>浓度</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(r => {
              const u = Users.byId(r.userId);
              const userName = u ? `${esc(u.nickname)}<br><span style="color:var(--muted);font-size:12px;">${esc(u.username)}</span>` : '—';
              const notes = (r.rows || []).map(row =>
                `<div><b style="color:var(--ink);margin-right:6px;font-weight:600;">${row.label}</b>${esc(row.text)}</div>`
              ).join('');
              return `
                <tr>
                  <td class="mono">${esc(r.code)}</td>
                  <td>${userName}</td>
                  <td>《${esc(r.name)}》</td>
                  <td style="color:var(--muted);font-size:12.5px;">${notes}</td>
                  <td>${esc(r.mood || '—')}</td>
                  <td>${esc(r.conc || '—')}</td>
                  <td class="mono">${fmtDate(r.createdAt)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ---- 用户 ---- */
  function renderAdminUsers(panel) {
    const list = Users.all();

    panel.innerHTML = `
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>昵称</th>
              <th>角色</th>
              <th>配方数</th>
              <th>订单数</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(u => {
              const rc = Recipes.byUser(u.id).length;
              const oc = Orders.byUser(u.id).length;
              return `
                <tr>
                  <td class="mono">${esc(u.id)}</td>
                  <td>${esc(u.username)}</td>
                  <td>${esc(u.nickname)}</td>
                  <td>${u.role === 'admin' ? '管理员' : '用户'}</td>
                  <td>${rc}</td>
                  <td>${oc}</td>
                  <td class="mono">${fmtDate(u.createdAt)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* =========================================================
     事件绑定
     ========================================================= */
  function bindEvents() {

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

    /* 保存到我的配方 */
    $('#saveBtn').addEventListener('click', () => {
      if (!currentCard) return;
      const u = Auth.currentUser();

      if (!u) {
        sessionStorage.setItem('sn_redirect', '#/workshop');
        alert('请先登录');
        location.hash = '#/login';
        return;
      }

      const list = Recipes.byUser(u.id);
      if (list.some(r => r.code === currentCard.code)) {
        alert('这个配方已经保存过了');
        return;
      }

      Recipes.add(Object.assign({}, currentCard, { userId: u.id }));
      alert('已保存到「我的配方」');
    });

    /* 下单 */
    $('#cartBtn').addEventListener('click', () => {
      if (!currentCard) return;
      openOrderModal(currentCard);
    });

    /* 登录 / 注册 */
    $$('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        authRole = tab.dataset.role;
        authMode = 'login';
        $$('.auth-tab').forEach(t => t.classList.toggle('active', t === tab));
        $('#authForm').reset();
        hideAuthMsg();
        updateAuthUI();
      });
    });
    $('#authForm').addEventListener('submit', submitAuth);

    /* 新增地址 */
    $('#addressForm').addEventListener('submit', submitAddress);

    /* 管理后台 Tabs */
    $('#adminTabs').addEventListener('click', e => {
      const btn = e.target.closest('.admin-tab');
      if (!btn) return;
      adminTab = btn.dataset.tab;
      renderAdmin();
    });

    /* 弹窗关闭 */
    $('#modalMask').addEventListener('click', e => {
      if (e.target === $('#modalMask')) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  /* =========================================================
     启动
     ========================================================= */
  function init() {
  // 价格集中渲染
  const kitPriceEl = document.getElementById('kitPrice');
  if (kitPriceEl) kitPriceEl.textContent = PRICE;

  renderHome();
  renderMoods();
  renderScents();
  renderFormula();
  updateStep();
  updateAuthUI();
  renderNavUser();
  renderNavLinks();
  bindEvents();
  route();
}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
