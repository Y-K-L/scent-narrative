/* =========================================================
   气味叙事 · 数据层 & 登录态
   用 localStorage 模拟后端，结构对齐真实 API
   ⚠️ 前端哈希仅用于演示，生产环境必须改为服务端校验
   ========================================================= */
(function () {
  'use strict';

  const K = {
    users:     'sn_users',
    session:   'sn_session',
    recipes:   'sn_recipes',
    orders:    'sn_orders',
    addresses: 'sn_addresses',
    seeded:    'sn_seeded_v3'
  };

  /* ---------- 底层读写 ---------- */
  function read(key, def) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) {
      return def;
    }
  }
  function write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  /* ---------- 演示用简单哈希 ---------- */
  function hash(str) {
    let h = 5381;
    str = String(str);
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return 'h' + (h >>> 0).toString(16);
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8);
  }

  function nowISO() { return new Date().toISOString(); }

  /* ---------- 种子数据 ---------- */
  function seed() {
    if (localStorage.getItem(K.seeded)) return;

    const t = nowISO();

    const users = [
      { id:'u_admin', username:'admin', password:hash('admin123'),
        role:'admin', nickname:'管理员', createdAt:t },
      { id:'u_demo',  username:'user',  password:hash('user123'),
        role:'user',  nickname:'体验用户', createdAt:t }
    ];

    const addresses = [
      { id:'a_demo1', userId:'u_demo', name:'张小叙', phone:'13800001111',
        province:'上海市', city:'上海市', district:'徐汇区',
        detail:'衡山路 100 号 3 号楼 201', isDefault:true, createdAt:t }
    ];

    const recipes = [
      { id:'r_demo1', userId:'u_demo', code:'No. 0427', name:'雨后书店',
        mood:'安静', conc:'EDT 12%',
        rows:[
          { label:'前调', text:'佛手柑 20% · 薄荷 10%' },
          { label:'中调', text:'纸莎草 25% · 紫罗兰 15%' },
          { label:'后调', text:'雪松 20% · 白麝香 10%' }
        ],
        meta:['浓度 EDT 12%','基底 酒精','静置 7 天','后调主导，余温绵长','情绪 安静'],
        createdAt:t }
    ];

    const orders = [
      { id:'o_demo1', userId:'u_demo', recipeId:'r_demo1',
        recipe:{
          code:'No. 0427', name:'雨后书店',
          rows:[
            { label:'前调', text:'佛手柑 20% · 薄荷 10%' },
            { label:'中调', text:'纸莎草 25% · 紫罗兰 15%' },
            { label:'后调', text:'雪松 20% · 白麝香 10%' }
          ],
          meta:['浓度 EDT 12%']
        },
        amount:198, status:'待处理',
        address:{
          name:'张小叙', phone:'13800001111',
          full:'上海市 上海市 徐汇区 衡山路 100 号 3 号楼 201'
        },
        createdAt:t }
    ];

    write(K.users, users);
    write(K.addresses, addresses);
    write(K.recipes, recipes);
    write(K.orders, orders);
    localStorage.setItem(K.seeded, '1');
  }

  /* =========================================================
     认证
     ========================================================= */
  const Auth = {
    register(username, password, nickname) {
      username = String(username || '').trim();
      password = String(password || '');

      if (username.length < 3) return { ok:false, msg:'用户名至少 3 位' };
      if (password.length < 6) return { ok:false, msg:'密码至少 6 位' };

      const users = read(K.users, []);
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { ok:false, msg:'用户名已存在' };
      }

      const user = {
        id: uid('u'),
        username: username,
        password: hash(password),
        role: 'user',
        nickname: String(nickname || '').trim() || username,
        createdAt: nowISO()
      };
      users.push(user);
      write(K.users, users);
      return { ok:true, user: user };
    },

    login(username, password, role) {
      username = String(username || '').trim();
      const users = read(K.users, []);
      const user = users.find(u =>
        u.username.toLowerCase() === username.toLowerCase());

      if (!user) return { ok:false, msg:'用户不存在' };
      if (user.password !== hash(password)) return { ok:false, msg:'密码错误' };
      if (role && user.role !== role) {
        return {
          ok:false,
          msg: role === 'admin' ? '该账号不是管理员' : '这是管理员账号，请切换入口'
        };
      }

      write(K.session, {
        userId: user.id,
        role: user.role,
        loginAt: nowISO()
      });
      return { ok:true, user: user };
    },

    logout() {
      localStorage.removeItem(K.session);
    },

    currentUser() {
      const s = read(K.session, null);
      if (!s) return null;
      const users = read(K.users, []);
      return users.find(u => u.id === s.userId) || null;
    },

    isAdmin() {
      const u = Auth.currentUser();
      return !!(u && u.role === 'admin');
    }
  };

  /* =========================================================
     配方
     ========================================================= */
  const Recipes = {
    byUser(userId) {
      return read(K.recipes, [])
        .filter(r => r.userId === userId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    all() {
      return read(K.recipes, [])
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    add(recipe) {
      const list = read(K.recipes, []);
      list.push(recipe);
      write(K.recipes, list);
    },
    remove(id, userId) {
      const list = read(K.recipes, []).filter(r =>
        !(r.id === id && (!userId || r.userId === userId)));
      write(K.recipes, list);
    }
  };

  /* =========================================================
     收货地址
     ========================================================= */
  const Addresses = {
    byUser(userId) {
      return read(K.addresses, []).filter(a => a.userId === userId);
    },
    all() {
      return read(K.addresses, []);
    },
    add(addr) {
      const list = read(K.addresses, []);
      if (addr.isDefault) {
        list.forEach(a => {
          if (a.userId === addr.userId) a.isDefault = false;
        });
      }
      list.push(addr);
      write(K.addresses, list);
    },
    remove(id, userId) {
      const list = read(K.addresses, []).filter(a =>
        !(a.id === id && (!userId || a.userId === userId)));
      write(K.addresses, list);
    },
    setDefault(id, userId) {
      const list = read(K.addresses, []);
      list.forEach(a => {
        if (a.userId === userId) a.isDefault = (a.id === id);
      });
      write(K.addresses, list);
    }
  };

  /* =========================================================
     订单
     ========================================================= */
  const Orders = {
    byUser(userId) {
      return read(K.orders, [])
        .filter(o => o.userId === userId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    all() {
      return read(K.orders, [])
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    add(order) {
      const list = read(K.orders, []);
      list.push(order);
      write(K.orders, list);
    },
    updateStatus(id, status) {
      const list = read(K.orders, []);
      const o = list.find(x => x.id === id);
      if (o) o.status = status;
      write(K.orders, list);
    }
  };

  /* =========================================================
     用户（管理员视角）
     ========================================================= */
  const Users = {
    all() {
      return read(K.users, []).map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        role: u.role,
        createdAt: u.createdAt
      }));
    },
    byId(id) {
      return read(K.users, []).find(u => u.id === id) || null;
    }
  };

  /* ---------- 初始化种子 ---------- */
  seed();

  /* ---------- 对外暴露 ---------- */
  window.Store = {
    Auth: Auth,
    Recipes: Recipes,
    Addresses: Addresses,
    Orders: Orders,
    Users: Users,
    uid: uid,
    hash: hash
  };
})();
