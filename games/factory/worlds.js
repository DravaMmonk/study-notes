// The repositories and issues of 《软件工厂》 chapters 0–2 (kit/domains/agent/world.js says what they are). Code is not
// written out: a file is its segments and how many tokens it takes; an issue says what it asks and which edits it
// needs, and how much of that its text gives away (`seen`).

const T = (zh, en) => ({ zh, en })

// A file of `tokens` tokens with these segments.
const f = (tokens, ...segs) => ({ tokens, segs })

export const repos = {
  // A small web shop: the repository of most levels.
  shop: {
    files: {
      'src/cart.js': f(320, 'addItem', 'removeItem', 'total'),
      'src/price.js': f(260, 'discount', 'tax'),
      'src/user.js': f(300, 'login', 'logout'),
      'README.md': f(180, 'intro'),
    },
  },
  // A blog whose files are long: a few of them fill the window.
  blog: {
    files: {
      'src/posts.js': f(480, 'listPosts', 'formatDate'),
      'src/text.js': f(420, 'slugify', 'excerpt'),
      'src/feed.js': f(450, 'rss', 'atom'),
      'src/theme.css': f(380, 'colors', 'layout'),
    },
  },
}

// A monorepo of many small packages: its listing alone is long.
const PACKAGES = ['auth', 'billing', 'cache', 'cli', 'config', 'cron', 'db', 'email', 'events', 'export', 'flags', 'geo', 'i18n', 'images', 'import', 'jobs', 'logs', 'maps', 'media', 'metrics', 'notify', 'orders', 'pdf', 'queue', 'search', 'shipping', 'sms', 'stock', 'tags', 'tax', 'uploads', 'users', 'webhooks', 'zip']
repos.mono = {
  files: Object.fromEntries(PACKAGES.map((p) => [`pkg/${p}/index.js`, f(340, 'init', 'handle', 'close', 'check')])),
}

export const issues = {
  // shop
  'qty-zero': {
    repo: 'shop',
    title: T('数量为 0 的商品', 'Items of quantity 0'),
    text: T('<code>src/cart.js</code> 的 <code>addItem</code>：数量为 0 的商品不应该加进购物车。', '<code>addItem</code> in <code>src/cart.js</code>: an item of quantity 0 should not go into the cart.'),
    edits: [{ at: 'src/cart.js#addItem', seen: 'file' }],
  },
  'remove-missing': {
    repo: 'shop',
    title: T('删掉不存在的商品', 'Removing an item that is not there'),
    text: T('<code>src/cart.js</code> 的 <code>removeItem</code>：删一件购物车里没有的商品时，应该什么都不做，现在会报错。', '<code>removeItem</code> in <code>src/cart.js</code>: removing an item not in the cart should do nothing; now it throws.'),
    edits: [{ at: 'src/cart.js#removeItem', seen: 'file' }],
  },
  'pasted-total': {
    repo: 'shop',
    title: T('总价少算了运费', 'The total leaves out shipping'),
    text: T('下面是 <code>src/cart.js</code> 的代码。<code>total</code> 算总价时漏掉了运费，请加上。', 'Here is the code of <code>src/cart.js</code>. <code>total</code> leaves shipping out of the total; please add it.'),
    pasted: ['src/cart.js'],
    tokens: 380,
    edits: [{ at: 'src/cart.js#total', seen: 'file' }],
  },
  'pasted-tax': {
    repo: 'shop',
    title: T('税率写死了', 'A hard-coded tax rate'),
    text: T('下面是 <code>src/price.js</code> 的代码。<code>tax</code> 把税率写死成 10%，应该从配置里读。', 'Here is the code of <code>src/price.js</code>. <code>tax</code> hard-codes a 10% rate; it should read the rate from the settings.'),
    pasted: ['src/price.js'],
    tokens: 320,
    edits: [{ at: 'src/price.js#tax', seen: 'file' }],
  },
  'tax-round': {
    repo: 'shop',
    title: T('税额的零头', 'Rounding the tax'),
    text: T('<code>src/price.js</code> 的 <code>tax</code>：税额要四舍五入到分。', '<code>tax</code> in <code>src/price.js</code>: the tax should be rounded to the cent.'),
    edits: [{ at: 'src/price.js#tax', seen: 'file' }],
  },
  'member-discount': {
    repo: 'shop',
    title: T('会员九折', 'Ten percent off for members'),
    text: T('会员结账打九折：<code>src/price.js</code> 的 <code>discount</code> 要认出会员，<code>src/cart.js</code> 的 <code>total</code> 要用上这个折扣。', 'Members get ten percent off at checkout: <code>discount</code> in <code>src/price.js</code> should know a member, and <code>total</code> in <code>src/cart.js</code> should apply it.'),
    edits: [{ at: 'src/price.js#discount', seen: 'file' }, { at: 'src/cart.js#total', seen: 'file' }],
  },
  coupon: {
    repo: 'shop',
    title: T('优惠券', 'Coupons'),
    text: T('支持优惠券：<code>src/cart.js</code> 的 <code>addItem</code> 要能带一张券，<code>src/price.js</code> 的 <code>discount</code> 按券减价。', 'Support coupons: <code>addItem</code> in <code>src/cart.js</code> should take a coupon, and <code>discount</code> in <code>src/price.js</code> should take it off the price.'),
    edits: [{ at: 'src/cart.js#addItem', seen: 'file' }, { at: 'src/price.js#discount', seen: 'file' }],
  },
  checkout: {
    repo: 'shop',
    title: T('结账三处', 'Three changes at checkout'),
    text: T('结账要改三处：<code>src/cart.js</code> 的 <code>addItem</code> 记下商品的税类，<code>total</code> 按税类分开加总，<code>src/price.js</code> 的 <code>tax</code> 按税类算。', 'Checkout needs three changes: <code>addItem</code> in <code>src/cart.js</code> keeps an item’s tax class, <code>total</code> adds up by tax class, and <code>tax</code> in <code>src/price.js</code> works by tax class.'),
    tokens: 90,
    edits: [{ at: 'src/cart.js#addItem', seen: 'file' }, { at: 'src/cart.js#total', seen: 'file' }, { at: 'src/price.js#tax', seen: 'file' }],
  },
  'logout-session': {
    repo: 'shop',
    title: T('退出后还登录着', 'Still signed in after signing out'),
    text: T('<code>logout</code> 没有清掉会话，退出以后刷新页面还是登录状态。', '<code>logout</code> does not clear the session: after signing out, a reload still shows you signed in.'),
    edits: [{ at: 'src/user.js#logout', seen: 'seg' }],
  },
  'login-case': {
    repo: 'shop',
    title: T('邮箱大小写', 'Upper and lower case in emails'),
    text: T('<code>login</code> 要忽略邮箱的大小写。', '<code>login</code> should ignore case in email addresses.'),
    edits: [{ at: 'src/user.js#login', seen: 'seg' }],
  },
  'discount-cap': {
    repo: 'shop',
    title: T('折扣不能超过一半', 'No more than half off'),
    text: T('<code>discount</code> 最多只能打到五折，现在叠加以后会出现负价格。', '<code>discount</code> should take at most half off; stacked discounts now give negative prices.'),
    edits: [{ at: 'src/price.js#discount', seen: 'seg', trap: true }],
  },
  'empty-cart': {
    repo: 'shop',
    title: T('空购物车的总价', 'The total of an empty cart'),
    text: T('购物车是空的时候，<code>total</code> 应该是 0，现在是 <code>NaN</code>。', 'With an empty cart, <code>total</code> should be 0; now it is <code>NaN</code>.'),
    edits: [{ at: 'src/cart.js#total', seen: 'seg', trap: true }],
  },
  'two-traps': {
    repo: 'shop',
    title: T('退款', 'Refunds'),
    text: T('支持退款：<code>removeItem</code> 退回已付的钱，<code>tax</code> 把退回部分的税也退掉。', 'Support refunds: <code>removeItem</code> pays back what was paid, and <code>tax</code> pays back the tax on it too.'),
    edits: [{ at: 'src/cart.js#removeItem', seen: 'seg', trap: true }, { at: 'src/price.js#tax', seen: 'seg', trap: true }],
  },
  'negative-total': {
    repo: 'shop',
    title: T('结账金额是负数', 'A negative checkout total'),
    text: T('有用户反馈：结账金额偶尔会是负数。', 'A user reports that the checkout total is sometimes negative.'),
    symptom: true,
    edits: [{ at: 'src/price.js#discount', seen: 'none', trap: true }],
  },
  'stuck-session': {
    repo: 'shop',
    title: T('换了账号还是原来的人', 'Switching accounts keeps the old one'),
    text: T('有用户反馈：退出再用另一个账号登录，看到的还是原来账号的购物车。', 'A user reports that after signing out and in with another account, they still see the old account’s cart.'),
    symptom: true,
    edits: [{ at: 'src/user.js#logout', seen: 'none' }, { at: 'src/cart.js#total', seen: 'none' }],
  },
  // blog
  'slug-spaces': {
    repo: 'blog',
    title: T('标题里的空格', 'Spaces in titles'),
    text: T('文章标题里有空格时，<code>slugify</code> 生成的链接打不开。', 'When a post title has spaces, the link <code>slugify</code> makes does not open.'),
    tokens: 80,
    edits: [{ at: 'src/text.js#slugify', seen: 'seg' }],
  },
  'date-format': {
    repo: 'blog',
    title: T('日期格式', 'Date format'),
    text: T('<code>formatDate</code> 要按读者所在的地区显示日期。', '<code>formatDate</code> should show dates the way the reader’s region writes them.'),
    tokens: 80,
    edits: [{ at: 'src/posts.js#formatDate', seen: 'seg' }],
  },
  'list-order': {
    repo: 'blog',
    title: T('文章顺序', 'Post order'),
    text: T('<code>listPosts</code> 要把最新的文章排在最前面。', '<code>listPosts</code> should put the newest posts first.'),
    tokens: 80,
    edits: [{ at: 'src/posts.js#listPosts', seen: 'seg' }],
  },
  // mono
  'webhook-retry': {
    repo: 'mono',
    title: T('webhook 重试', 'Retrying webhooks'),
    text: T('<code>handle</code> 遇到对方超时时要重试三次，现在直接丢掉。见 <code>webhooks</code> 包的测试。', '<code>handle</code> should retry three times when the other side times out; now it drops the call. See the tests of the <code>webhooks</code> package.'),
    edits: [{ at: 'pkg/webhooks/index.js#handle', seen: 'seg' }],
  },
}
