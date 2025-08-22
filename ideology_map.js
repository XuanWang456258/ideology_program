// 意识形态三轴范围配置与分类工具
// 轴说明：
// economic: -10(极左/公有化) → 10(极右/自由放任)
// culture:  -10(文化“激进/解构”) → 10(文化保守/传统)
// authority: -10(极自由/去中心) → 10(极集中/威权)

const IDEOLOGY_RANGES = [
  // 保守与右派
  { name: '保守主义', econ: [2, 8], cult: [2, 8], auth: [0, 7] },
  { name: '新保守主义', econ: [2, 8], cult: [0, 6], auth: [3, 9] },
  { name: '反动主义', econ: [4, 10], cult: [6, 10], auth: [6, 10] },
  { name: '资本主义', econ: [4, 10], cult: [-2, 6], auth: [-2, 6] },
  { name: '麦卡锡主义', econ: [2, 8], cult: [4, 10], auth: [4, 10] },
  { name: '新自由主义', econ: [3, 10], cult: [-2, 4], auth: [-2, 3] },
  { name: '自由主义', econ: [0, 6], cult: [-6, 0], auth: [-6, -1] },
  { name: '凯恩斯主义', econ: [-2, 3], cult: [-2, 4], auth: [-1, 4] },
  { name: '第三条道路', econ: [-2, 4], cult: [-2, 4], auth: [-2, 4] },

  // 国家主义与极右威权
  { name: '国家主义', econ: [0, 8], cult: [0, 8], auth: [6, 10] },
  { name: '法西斯主义', econ: [0, 6], cult: [6, 10], auth: [8, 10] },
  { name: '新法西斯主义', econ: [0, 6], cult: [6, 10], auth: [8, 10] },
  { name: '纳粹主义', econ: [0, 6], cult: [8, 10], auth: [9, 10] },
  { name: '军国主义', econ: [0, 6], cult: [4, 10], auth: [8, 10] },
  { name: '帝国主义', econ: [0, 8], cult: [2, 10], auth: [8, 10] },
  { name: '威权主义', econ: [-4, 8], cult: [-2, 8], auth: [7, 10] },
  { name: '集权主义', econ: [-6, 6], cult: [-4, 8], auth: [8, 10] },

  // 社会主义与共产主义谱系（左派）
  { name: '原教旨马克思主义', econ: [-10, -7], cult: [-6, 2], auth: [2, 8] },
  { name: '马克思主义', econ: [-10, -6], cult: [-6, 2], auth: [2, 8] },
  { name: '社会主义', econ: [-8, -2], cult: [-2, 4], auth: [0, 7] },
  { name: '共产主义', econ: [-10, -6], cult: [-6, 2], auth: [3, 10] },
  { name: '社会民主主义', econ: [-4, 1], cult: [-2, 4], auth: [-2, 3] },
  { name: '民主社会主义', econ: [-8, -2], cult: [-4, 4], auth: [-2, 4] },
  { name: '市场社会主义', econ: [-6, 0], cult: [-2, 4], auth: [-1, 5] },
  { name: '中国特色社会主义', econ: [-6, 0], cult: [-2, 6], auth: [4, 9] },
  { name: '新左派', econ: [-8, -2], cult: [-4, 4], auth: [-2, 5] },

  // 无政府主义与工团
  { name: '无政府主义（安那其）', econ: [-8, 2], cult: [-8, 2], auth: [-10, -6] },
  { name: '无政府资本主义（安那其资本主义）', econ: [3, 10], cult: [-4, 3], auth: [-10, -6] },
  { name: '无政府共产主义（安那其共产主义）', econ: [-10, -6], cult: [-8, 2], auth: [-10, -6] },
  { name: '无政府社会主义（安那其社会主义）', econ: [-10, -6], cult: [-6, 2], auth: [-10, -6] },
  { name: '无政府个人主义（安那其个人主义）', econ: [0, 8], cult: [-8, 2], auth: [-10, -6] },
  { name: '互助主义', econ: [-8, -2], cult: [-6, 2], auth: [-10, -6] },
  { name: '纲领无政府主义', econ: [-10, -4], cult: [-8, 0], auth: [-10, -6] },
  { name: '工团主义', econ: [-10, -6], cult: [-6, 2], auth: [-6, -1] },

  // 共产主义流派
  { name: '列宁主义', econ: [-10, -6], cult: [-6, 2], auth: [6, 10] },
  { name: '马克思列宁主义', econ: [-10, -6], cult: [-6, 2], auth: [7, 10] },
  { name: '斯大林主义', econ: [-10, -6], cult: [-4, 4], auth: [8, 10] },
  { name: '毛泽东主义', econ: [-10, -6], cult: [-4, 4], auth: [7, 10] },
  { name: '托洛茨基主义', econ: [-10, -6], cult: [-6, 2], auth: [3, 7] },
  { name: '卢森堡主义', econ: [-10, -6], cult: [-6, 2], auth: [0, 5] },
  { name: '欧洲马克思主义', econ: [-10, -6], cult: [-6, 2], auth: [0, 4] },
  { name: '波萨达斯主义', econ: [-10, -6], cult: [-6, 2], auth: [3, 8] },

  // 其他
  { name: '民主主义', econ: [-2, 2], cult: [-2, 2], auth: [-2, 2] },
  { name: '民粹主义', econ: [-6, 6], cult: [-4, 8], auth: [0, 8] },
];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function isWithinRange(v, range) { return v >= range[0] && v <= range[1]; }

function distanceToBoxCenter(econ, cult, auth, box) {
  const cx = (box.econ[0] + box.econ[1]) / 2;
  const cy = (box.cult[0] + box.cult[1]) / 2;
  const cz = (box.auth[0] + box.auth[1]) / 2;
  const dx = econ - cx; const dy = cult - cy; const dz = auth - cz;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function classifyIdeology(scores) {
  const econ = clamp(scores.economic, -10, 10);
  const cult = clamp(scores.culture, -10, 10);
  const auth = clamp(scores.authority, -10, 10);

  // 1) 先筛选所有满足范围的候选
  const matches = IDEOLOGY_RANGES.filter(r =>
    isWithinRange(econ, r.econ) &&
    isWithinRange(cult, r.cult) &&
    isWithinRange(auth, r.auth)
  );
  if (matches.length === 1) return matches[0].name;
  if (matches.length > 1) {
    // 取与各候选框中心距离最近者
    let best = matches[0];
    let bestD = distanceToBoxCenter(econ, cult, auth, matches[0]);
    for (let i = 1; i < matches.length; i++) {
      const d = distanceToBoxCenter(econ, cult, auth, matches[i]);
      if (d < bestD) { best = matches[i]; bestD = d; }
    }
    return best.name;
  }

  // 2) 若无匹配，取与所有框中心距离最近者
  let best = IDEOLOGY_RANGES[0];
  let bestD = distanceToBoxCenter(econ, cult, auth, IDEOLOGY_RANGES[0]);
  for (let i = 1; i < IDEOLOGY_RANGES.length; i++) {
    const d = distanceToBoxCenter(econ, cult, auth, IDEOLOGY_RANGES[i]);
    if (d < bestD) { best = IDEOLOGY_RANGES[i]; bestD = d; }
  }
  return best.name;
}

// 暴露到全局
window.__IdeologyMap__ = { IDEOLOGY_RANGES, classifyIdeology };


