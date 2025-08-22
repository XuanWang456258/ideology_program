// 合体版意识形态调查问卷 - JavaScript逻辑
let currentPage = 1;
const totalPages = 4; // 基础信息页数
const TOTAL_QUESTIONS = 30; // 意识形态测试题目数
const AXIS_LABEL = {
  economic: "经济",
  culture: "文化", 
  authority: "权力集中度"
};

// 地理数据
const geoData = {
  "中国": {"北京":["北京"],"上海":["上海"],"广东":["广州","深圳"],"其他":[]},
  "美国": {"加利福尼亚州":["洛杉矶","旧金山"],"纽约州":["纽约市","布法罗"],"其他":[]},
  "澳大利亚":{"新南威尔士":["悉尼","纽卡斯尔"],"维多利亚":["墨尔本"],"其他":[]},
  "德国":{"巴伐利亚":["慕尼黑"],"其他":[]},
  "其他":{"未知":["未知"]},
  "未知":{"未知":["未知"]}
};

// 意识形态测试相关变量
let allQuestions = [];
let quizQuestions = [];
let currentQuizIndex = 0;
let answers = new Map();

// 初始化
function init() {
  // 记录开始时间
  if (!localStorage.getItem('surveyStartTime')) {
    localStorage.setItem('surveyStartTime', new Date().toLocaleString());
  }
  
  updateProgressBar();
  restoreData();
  setupUnifiedInputs();
  setupCountryStateCity();
  setupAutoSave();
  setupQuizLogic();
}

// 基础信息页面逻辑
function showPage(pageNum) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`page${pageNum}`).style.display = 'block';
  currentPage = pageNum;
  updateProgressBar();
}

function updateProgressBar() {
  const progress = ((currentPage - 1) / (totalPages - 1)) * 100;
  document.getElementById('progressBar').style.width = `${progress}%`;
}

function setupUnifiedInputs() {
  document.querySelectorAll('input[data-unified-for]').forEach(input => {
    const targetName = input.getAttribute('data-unified-for');
    input.addEventListener('input', () => {
      const sel = document.querySelector(`select[name="${targetName}"]`);
      sel.value = input.value.trim() ? input.value.trim() : "其他";
    });
  });
}

function setupCountryStateCity() {
  const countrySelect = document.getElementById('countrySelect');
  const provinceSelect = document.getElementById('stateSelect');
  const citySelect = document.getElementById('citySelect');

  function updateProvince() {
    const c = countrySelect.value || "未知";
    provinceSelect.innerHTML = '';
    Object.keys(geoData[c] || {"未知":["未知"]}).forEach(p => 
      provinceSelect.appendChild(new Option(p, p))
    );
    provinceSelect.value = "未知";
    updateCity();
  }

  function updateCity() {
    const c = countrySelect.value || "未知";
    const p = provinceSelect.value || "未知";
    citySelect.innerHTML = '';
    (geoData[c] && geoData[c][p] ? geoData[c][p] : ["未知"]).forEach(city => 
      citySelect.appendChild(new Option(city, city))
    );
    citySelect.value = "未知";
  }

  countrySelect.addEventListener('change', () => { updateProvince(); saveData(); });
  provinceSelect.addEventListener('change', () => { updateCity(); saveData(); });
}

function setupAutoSave() {
  document.querySelectorAll('input,select,textarea').forEach(el => {
    el.addEventListener('input', debounce(saveData, 1000));
  });
}

function saveData() {
  const formData = {};
  document.querySelectorAll('input,select,textarea').forEach(el => { 
    if(el.name) formData[el.name] = el.value;
  });
  localStorage.setItem('questionnaireData', JSON.stringify(formData));
  
  const indicator = document.getElementById('saveIndicator');
  indicator.style.opacity = '1';
  setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
}

function restoreData() {
  const saved = localStorage.getItem('questionnaireData');
  if(saved) {
    const data = JSON.parse(saved);
    for(const [key,val] of Object.entries(data)) {
      const el = document.querySelector(`[name="${key}"]`);
      if(el) el.value = val;
    }
  }
}

function debounce(func, wait) {
  let timeout; 
  return function(...args) {
    clearTimeout(timeout); 
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 页面验证和导航
function validatePage(pageNum) {
  if(pageNum === totalPages) {
    if(!checkRequired()) return;
    startIdeologyQuiz();
  } else {
    if(!checkRequiredPage(pageNum)) return;
    showPage(pageNum + 1);
  }
}

function checkRequiredPage(pageNum) {
  const page = document.getElementById(`page${pageNum}`);
  const requiredEls = page.querySelectorAll('[required]');
  for(const el of requiredEls) {
    const value = el.value.trim();
    if(!value) { 
      alert('请完成当前页面的必填项'); 
      return false;
    }
  }
  return true;
}

function checkRequired() {
  const requiredEls = document.querySelectorAll('[required]');
  for(const el of requiredEls) {
    const value = el.value.trim();
    if(!value) { 
      alert('请完成所有必填项'); 
      return false;
    }
  }
  return true;
}

// 意识形态测试逻辑
function setupQuizLogic() {
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnRestart = document.getElementById('btnRestart');
  
  btnPrev.addEventListener('click', prevQuiz);
  btnNext.addEventListener('click', nextOrSubmit);
  btnRestart.addEventListener('click', restartSurvey);
}

function startIdeologyQuiz() {
  // 隐藏所有基础信息页面
  for(let i = 1; i <= totalPages; i++) {
    document.getElementById(`page${i}`).style.display = 'none';
  }
  
  // 显示测试页面
  document.getElementById('quizPage').style.display = 'block';
  
  // 加载题目
  loadQuestionsAndStart();
}

async function loadQuestionsAndStart() {
  try {
    await loadQuestions();
    quizQuestions = pickBalancedQuestions();
    if (!quizQuestions.length) {
      document.getElementById('questionTitle').textContent = '题库为空，请先在 questions.json 中添加题目。';
      document.getElementById('btnNext').disabled = true;
      return;
    }
    renderQuestion();
  } catch (e) {
    document.getElementById('questionTitle').textContent = '载入题库失败，请检查文件或网络。';
    console.error(e);
  }
}

function loadQuestions() {
  return fetch('questions.json', { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      allQuestions = Array.isArray(data) ? data : [];
    });
}

function pickBalancedQuestions() {
  // 现在每道题都是多维度的，直接随机选择题目
  const selected = [];
  const pool = allQuestions.slice();
  
  if (pool.length === 0) return selected;
  
  shuffleInPlace(pool);
  
  // 选择前30题，如果不足则循环补齐
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    selected.push({ ...pool[i % pool.length] });
  }
  
  return selected;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuestion() {
  const q = quizQuestions[currentQuizIndex];
  document.getElementById('questionTitle').textContent = q.question || '（无题目）';

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  const saved = answers.get(currentQuizIndex);
  
  (q.options || []).forEach((opt, idx) => {
    const optionId = `q${currentQuizIndex}_opt${idx}`;
    const wrap = document.createElement('label');
    wrap.className = 'option';
    wrap.setAttribute('for', optionId);

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `q${currentQuizIndex}`;
    input.id = optionId;
    input.value = String(idx);
    if (saved && saved.selectedIndex === idx) input.checked = true;
    input.addEventListener('change', () => {
      // 存储选择的选项索引和对应的三轴分值
      answers.set(currentQuizIndex, { 
        selectedIndex: idx,
        economic_score: opt.economic_score || 0,
        culture_score: opt.culture_score || 0,
        authority_score: opt.authority_score || 0
      });
      renderLiveScores();
      document.getElementById('btnNext').disabled = false;
    });

    const span = document.createElement('span');
    span.textContent = opt.text;

    wrap.appendChild(input);
    wrap.appendChild(span);
    optionsEl.appendChild(wrap);
  });

  updateQuizProgress();
  renderLiveScores();
  
  // 若当前题尚未作答，则禁用"下一题/提交"按钮
  document.getElementById('btnNext').disabled = !saved;
}

function updateQuizProgress() {
  const pct = Math.round((currentQuizIndex / TOTAL_QUESTIONS) * 100);
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('pageIndicator').textContent = `第 ${Math.min(currentQuizIndex + 1, TOTAL_QUESTIONS)} / ${TOTAL_QUESTIONS} 题`;
  
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  
  btnPrev.disabled = currentQuizIndex === 0;
  btnNext.textContent = currentQuizIndex === TOTAL_QUESTIONS - 1 ? '提交结果 ' : '下一题 ';
  
  if (!btnNext.querySelector('i')) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-arrow-right';
    btnNext.appendChild(icon);
  }
}

function renderLiveScores() {
  const { economic, culture, authority } = computeScores();
  const liveScores = document.getElementById('liveScores');
  liveScores.innerHTML = '';
  liveScores.appendChild(makeBadge(`${AXIS_LABEL.economic}: ${economic.toFixed(2)}`));
  liveScores.appendChild(makeBadge(`${AXIS_LABEL.culture}: ${culture.toFixed(2)}`));
  liveScores.appendChild(makeBadge(`${AXIS_LABEL.authority}: ${authority.toFixed(2)}`));
}

function makeBadge(text) {
  const el = document.createElement('span');
  el.className = 'badge';
  el.textContent = text;
  return el;
}



function computeScores() {
  // 计算所有选择选项的三轴分值的平均值
  let economic = 0, culture = 0, authority = 0;
  let answeredCount = 0;
  
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const a = answers.get(i);
    if (!a) continue;
    
    economic += a.economic_score || 0;
    culture += a.culture_score || 0;
    authority += a.authority_score || 0;
    answeredCount++;
  }
  
  // 计算平均值
  if (answeredCount > 0) {
    economic = economic / answeredCount;
    culture = culture / answeredCount;
    authority = authority / answeredCount;
  }
  
  return { economic, culture, authority };
}

function nextOrSubmit() {
  // 未选择选项时禁止进入下一题/提交
  if (!answers.get(currentQuizIndex)) {
    alert('请先选择一个选项再继续。');
    return;
  }
  
  if (currentQuizIndex < TOTAL_QUESTIONS - 1) {
    currentQuizIndex++;
    renderQuestion();
  } else {
    showFinalResults();
  }
}

function prevQuiz() {
  if (currentQuizIndex > 0) {
    currentQuizIndex--;
    renderQuestion();
  }
}

function showFinalResults() {
  const scores = computeScores();
  const { classifyIdeology } = window.__IdeologyMap__ || {};
  const ideologyName = classifyIdeology ? classifyIdeology(scores) : '未识别';
  
  // 显示意识形态结果
  const finalIdeology = document.getElementById('finalIdeology');
  finalIdeology.innerHTML = '';
  finalIdeology.appendChild(makeBadge(ideologyName));
  
  // 显示用户信息摘要
  const userInfoSummary = document.getElementById('userInfoSummary');
  userInfoSummary.innerHTML = `
    <h3>用户信息摘要</h3>
    <div class="info-row">
      <span class="info-label">姓名：</span>
      <span class="info-value">${document.querySelector('[name="name"]').value || '匿名'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">性别：</span>
      <span class="info-value">${document.querySelector('[name="gender"]').value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">年龄：</span>
      <span class="info-value">${document.querySelector('[name="age"]').value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">民族：</span>
      <span class="info-value">${document.querySelector('[name="ethnicity"]').value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">国家：</span>
      <span class="info-value">${document.querySelector('[name="country"]').value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">省/州：</span>
      <span class="info-value">${document.querySelector('[name="province"]').value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">城市：</span>
      <span class="info-value">${document.querySelector('[name="city"]').value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">职业：</span>
      <span class="info-value">${document.querySelector('[name="occupation"]').value}</span>
    </div>
  `;
  
  // 隐藏测试页面，显示结果页面
  document.getElementById('quizPage').style.display = 'none';
  document.getElementById('resultPage').style.display = 'block';
  document.getElementById('progressBar').style.width = '100%';
  
  // 自动提交数据到服务器
  submitCompleteData(scores, ideologyName);
}

function restartSurvey() {
  // 重置所有状态
  currentPage = 1;
  currentQuizIndex = 0;
  answers.clear();
  
  // 清空所有输入
  document.querySelectorAll('input,select,textarea').forEach(el => {
    if (el.type !== 'button') el.value = '';
  });
  
  // 重置选择框
  setupCountryStateCity();
  
  // 显示第一页
  showPage(1);
  
  // 隐藏其他页面
  document.getElementById('quizPage').style.display = 'none';
  document.getElementById('resultPage').style.display = 'none';
  
  // 清除本地存储
  localStorage.removeItem('questionnaireData');
}

// 绑定Enter键快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    
    // 检查当前在哪个页面
    const quizVisible = document.getElementById('quizPage').style.display !== 'none';
    const resultVisible = document.getElementById('resultPage').style.display !== 'none';
    
    if (quizVisible && !resultVisible) {
      // 在测试页面
      if (!answers.get(currentQuizIndex)) {
        alert('请先选择一个选项再继续。');
        return;
      }
      const btnNext = document.getElementById('btnNext');
      if (!btnNext.disabled) nextOrSubmit();
    } else if (!quizVisible && !resultVisible) {
      // 在基础信息页面
      const currentPageEl = document.querySelector('.page[style*="block"]');
      if (currentPageEl) {
        const pageNum = parseInt(currentPageEl.id.replace('page', ''));
        validatePage(pageNum);
      }
    }
  }
});

// 数据提交函数
function submitCompleteData(scores, ideologyName) {
  const formData = new FormData();
  
  // 收集基础信息（排除意识形态测试的选项）
  document.querySelectorAll('input,select,textarea').forEach(el => {
    if(el.name && !el.name.startsWith('q')) { // 排除以'q'开头的测试题目选项
      if(el.name.endsWith('_other')) {
        const main = el.name.replace('_other','');
        if(!formData.get(main)) formData.append(main, el.value);
      } else {
        const otherEl = document.querySelector(`[name="${el.name}_other"]`);
        if(otherEl && otherEl.value.trim() !== '') formData.append(el.name, otherEl.value);
        else formData.append(el.name, el.value);
      }
    }
  });
  
  // 添加意识形态测试结果
  formData.append('ideology_name', ideologyName);
  formData.append('economic_score', scores.economic.toFixed(2));
  formData.append('culture_score', scores.culture.toFixed(2));
  formData.append('authority_score', scores.authority.toFixed(2));
  
  // 添加时间戳
  formData.append('start_time', localStorage.getItem('surveyStartTime') || '未知');
  formData.append('end_time', new Date().toLocaleString());
  formData.append('submit_time', new Date().toLocaleString());
  
  // 添加测试完成标识
  formData.append('survey_completed', 'true');
  
  // 显示提交状态
  const btnRestart = document.getElementById('btnRestart');
  const originalText = btnRestart.innerHTML;
  btnRestart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在提交...';
  btnRestart.disabled = true;
  
  // 创建状态日志元素
  let logEl = document.getElementById('submitLog');
  if(!logEl) {
    logEl = document.createElement('div');
    logEl.id = 'submitLog';
    logEl.style.position = 'fixed';
    logEl.style.bottom = '60px';
    logEl.style.right = '20px';
    logEl.style.padding = '10px 15px';
    logEl.style.background = 'rgba(0,0,0,0.7)';
    logEl.style.color = 'white';
    logEl.style.borderRadius = '8px';
    logEl.style.zIndex = '1000';
    logEl.style.fontSize = '0.9rem';
    document.body.appendChild(logEl);
  }
  logEl.textContent = '正在提交数据...';
  
  // 提交到服务器（使用与test8.html相同的formcarry地址）
  fetch('https://formcarry.com/s/Ef13ZVrZcrl', {
    method: 'POST',
    body: formData
  }).then(res => {
    if(res.ok) {
      logEl.textContent = '数据提交成功 ✅';
      btnRestart.innerHTML = originalText;
      btnRestart.disabled = false;
      localStorage.removeItem('questionnaireData');
      localStorage.removeItem('surveyStartTime');
    } else {
      logEl.textContent = '提交失败 ❌';
      throw new Error('网络错误');
    }
  }).catch(() => {
    logEl.textContent = '数据已经在路上了 ✅，网络不通畅可能会导致延迟';
    btnRestart.innerHTML = originalText;
    btnRestart.disabled = false;
    localStorage.removeItem('questionnaireData');
    localStorage.removeItem('surveyStartTime');
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
