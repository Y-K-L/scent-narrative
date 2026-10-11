/* =========================================================
   气味叙事 · 静态数据
   ========================================================= */

window.SCENTS = {
  top: [
    { id:'bergamot',   name:'佛手柑', desc:'清晨第一缕阳光', color:'#E8C547' },
    { id:'lemon',      name:'柠檬',   desc:'干净、清醒',     color:'#EFD75A' },
    { id:'grapefruit', name:'葡萄柚', desc:'微苦的明亮',     color:'#F0A07C' },
    { id:'mint',       name:'薄荷',   desc:'一阵凉意',       color:'#9CCFA6' },
    { id:'orange',     name:'橙皮',   desc:'灶台上的甜',     color:'#E89B4C' },
    { id:'seasalt',    name:'海盐',   desc:'退潮后的风',     color:'#A8CBD6' }
  ],
  mid: [
    { id:'rose',     name:'玫瑰',   desc:'柔软的花瓣',   color:'#D98A9E' },
    { id:'jasmine',  name:'茉莉',   desc:'夜色里的白花', color:'#EDE3C8' },
    { id:'lavender', name:'薰衣草', desc:'安静的紫',     color:'#A79BC4' },
    { id:'neroli',   name:'橙花',   desc:'微苦的温柔',   color:'#F2D6A2' },
    { id:'violet',   name:'紫罗兰', desc:'旧书页的粉感', color:'#B49BC8' },
    { id:'papyrus',  name:'纸莎草', desc:'干燥的纸张',   color:'#C9B48C' }
  ],
  base: [
    { id:'cedar',   name:'雪松',   desc:'旧木书桌的安稳', color:'#9A7B58' },
    { id:'sandal',  name:'檀香',   desc:'温润的木头',     color:'#C39A6B' },
    { id:'amber',   name:'琥珀',   desc:'贴肤的余温',     color:'#C98A4B' },
    { id:'musk',    name:'白麝香', desc:'刚洗过的白衬衫', color:'#E3DCCF' },
    { id:'vanilla', name:'香草',   desc:'甜而暖',         color:'#D8B98A' },
    { id:'tobacco', name:'烟草',   desc:'壁炉旁的外套',   color:'#8B6A4A' }
  ]
};

window.TYPE_LABEL  = { top:'前调', mid:'中调', base:'后调' };
window.LAYER_COLOR = { top:'#E0B15C', mid:'C97B5A', base:'#8B6A4A' };

window.MOODS = ['治愈','清醒','浪漫','安静','温暖','自由'];

window.HOT_RECIPES = [
  { name:'雨后书店', mood:'安静',
    notes:{ top:[['佛手柑',20],['薄荷',10]], mid:[['纸莎草',25],['紫罗兰',15]], base:[['雪松',20],['白麝香',10]] },
    story:'翻开一本旧书，纸页还带着潮气。' },
  { name:'外婆的厨房', mood:'温暖',
    notes:{ top:[['橙皮',25],['柠檬',10]], mid:[['橙花',20],['玫瑰',10]], base:[['香草',20],['琥珀',15]] },
    story:'灶台上咕嘟咕嘟，是整个童年的背景音。' },
  { name:'冬日壁炉', mood:'温暖',
    notes:{ top:[['佛手柑',15],['葡萄柚',10]], mid:[['纸莎草',20],['薰衣草',15]], base:[['雪松',20],['烟草',10],['琥珀',10]] },
    story:'外面下着雪，屋里只剩木柴裂开的声音。' },
  { name:'夏夜花园', mood:'浪漫',
    notes:{ top:[['佛手柑',15],['薄荷',10]], mid:[['茉莉',30],['玫瑰',15]], base:[['白麝香',20],['雪松',10]] },
    story:'晚风穿过篱笆，花还没睡。' },
  { name:'海边清晨', mood:'清醒',
    notes:{ top:[['海盐',25],['葡萄柚',15]], mid:[['橙花',20],['薰衣草',10]], base:[['白麝香',20],['雪松',10]] },
    story:'潮水退去，沙滩上只剩干净的风。' },
  { name:'凌晨便利店', mood:'自由',
    notes:{ top:[['薄荷',25],['柠檬',15]], mid:[['紫罗兰',25],['纸莎草',10]], base:[['白麝香',15],['琥珀',10]] },
    story:'全世界都睡了，只有灯还亮着。' }
];

window.WALL = [
  ['旧木抽屉',281],['第一场雪',316],['他的外套',392],
  ['搬家那天',405],['考试前的清晨',441],['妈妈的围巾',468],
  ['周五晚上',493],['一个人的房间',512]
];

/* =========================================================
   产品列表
   新增产品只需在这里加一项
   ========================================================= */
window.PRODUCTS = [
  {
    id: 'starter-kit',
    name: '新手调香套装',
    badge: '新手推荐',
    desc: '前调香材 2 种 · 中调香材 2 种 · 后调香材 2 种，含基底 30ml、空瓶 1 个、手写配方卡、入门手册。',
    price: 298,
    note: '含代调成品服务'
  },
  {
    id: 'diy-perfume-50',
    name: '50ml DIY 香水',
    badge: '热销',
    desc: '50ml 定制成品香水，按你的配方由我们代调、静置、灌装，7 天内发货。',
    price: 398,
    note: '含代调成品服务'
  }
];

/* 兼容旧逻辑：默认价格取第一个产品 */
window.PRICE = window.PRODUCTS[0].price;
