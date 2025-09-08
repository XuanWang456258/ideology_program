// 两阶段意识形态倾向测试 - 主逻辑
const STAGE1_QUESTIONS = 15; // 第一阶段题目数（每个轴5道题）
const STAGE2_QUESTIONS = 5;  // 第二阶段题目数
const TOTAL_QUESTIONS = STAGE1_QUESTIONS + STAGE2_QUESTIONS;

const AXIS_LABEL = {
  economic: "经济",
  culture: "文化", 
  authority: "权力集中度"
};

// 测试相关变量
let stage1Questions = [];
let stage2Questions = {};
let ideologyCategories = {};
let specificTerms = {};
let currentStage = 1;
let currentQuestionIndex = 0;
let answers = new Map();
let stage1Scores = { economic: 0, culture: 0, authority: 0 };
let stage2Scores = new Map(); // 存储第二阶段每个意识形态的得分
let determinedCategory = null;
let determinedIdeology = null;

// 初始化
function init() {
  // 记录开始时间
  if (!localStorage.getItem('surveyStartTime')) {
    localStorage.setItem('surveyStartTime', new Date().toLocaleString());
  }
  
  updateProgressBar();
  restoreData();
  setupQuizLogic();
  startIdeologyQuiz();
}

function updateProgressBar() {
  const progress = (currentQuestionIndex / (currentStage === 1 ? STAGE1_QUESTIONS : STAGE2_QUESTIONS)) * 100;
  document.getElementById('progressBar').style.width = `${progress}%`;
}

function saveData() {
  const formData = {
    currentStage: currentStage,
    currentQuestionIndex: currentQuestionIndex,
    stage1Scores: stage1Scores,
    determinedCategory: determinedCategory,
    answers: Object.fromEntries(answers)
  };
  localStorage.setItem('quizAnswers', JSON.stringify(formData));
  
  const indicator = document.getElementById('saveIndicator');
  indicator.style.opacity = '1';
  setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
}

function restoreData() {
  const saved = localStorage.getItem('quizAnswers');
  if(saved) {
    const data = JSON.parse(saved);
    currentStage = data.currentStage || 1;
    currentQuestionIndex = data.currentQuestionIndex || 0;
    stage1Scores = data.stage1Scores || { economic: 0, culture: 0, authority: 0 };
    determinedCategory = data.determinedCategory || null;
    answers = new Map(Object.entries(data.answers || {}));
  }
}

// 测试逻辑
function setupQuizLogic() {
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnRestart = document.getElementById('btnRestart');
  
  btnPrev.addEventListener('click', prevQuestion);
  btnNext.addEventListener('click', nextOrSubmit);
  btnRestart.addEventListener('click', restartSurvey);
}

function startIdeologyQuiz() {
  // 显示测试页面
  document.getElementById('quizPage').style.display = 'block';
  
  // 加载题目
  loadQuestionsAndStart();
}

async function loadStage2Questions() {
  const categoryFiles = [
    'question_stage2_aad.json',
    'question_stage2_lamu.json', 
    'question_stage2_mmm.json',
    'question_stage2_mlmu.json',
    'question_stage2_mrmu.json',
    'question_stage2_mrmu2.json',
    'question_stage2_rlm.json',
    'question_stage2_rlu.json',
    'question_stage2_rmrm.json',
    'question_stage2_rru.json'
  ];
  
  const promises = categoryFiles.map(file => 
    fetch(file, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText} for ${file}`);
        return res.json();
      })
  );
  
  const results = await Promise.all(promises);
  
  // 合并所有类别数据
  stage2Questions = {};
  results.forEach(data => {
    Object.assign(stage2Questions, data);
  });
  
  console.log('Stage2 questions loaded:', Object.keys(stage2Questions).length);
  return stage2Questions;
}

async function loadQuestionsAndStart() {
  try {
    await loadAllData();
    if (currentStage === 1) {
      renderStage1Question();
    } else {
      renderStage2Question();
    }
  } catch (e) {
    document.getElementById('questionTitle').textContent = '载入题库失败，请检查文件或网络。';
    console.error('加载数据失败:', e);
    console.error('错误详情:', e.message);
    console.error('堆栈跟踪:', e.stack);
  }
}

async function loadAllData() {
  try {
    // 先加载Stage1题目（必需）
    const stage1Response = await fetch('question_stage1.json', { cache: 'no-store' });
    if (!stage1Response.ok) throw new Error(`HTTP ${stage1Response.status}: ${stage1Response.statusText}`);
    stage1Questions = await stage1Response.json();
    console.log('Stage1 questions loaded:', stage1Questions.length);
    
    // 并行加载其他数据（可选）
    const otherDataPromises = [
      loadStage2Questions().catch(e => {
        console.warn('Stage2 questions failed to load:', e);
        return {};
      }),
      fetch('ideology_categories.json', { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.json();
        })
        .then(data => { 
          console.log('Ideology categories loaded:', Object.keys(data).length);
          return data;
        })
        .catch(e => {
          console.warn('Ideology categories failed to load:', e);
          return {};
        }),
      fetch('ideology_specific_terms.json', { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.json();
        })
        .then(data => { 
          console.log('Specific terms loaded:', Object.keys(data).length);
          return data;
        })
        .catch(e => {
          console.warn('Specific terms failed to load:', e);
          return {};
        })
    ];
    
    const [stage2Data, categoriesData, termsData] = await Promise.all(otherDataPromises);
    
    stage2Questions = stage2Data;
    ideologyCategories = categoriesData;
    specificTerms = termsData;
    
  } catch (e) {
    console.error('Failed to load essential data:', e);
    throw e;
  }
}

function renderStage1Question() {
  const question = stage1Questions[currentQuestionIndex];
  document.getElementById('questionTitle').textContent = question.question || '（无题目）';
  
  // 更新页面标题
  document.querySelector('.section-header h2').textContent = '意识形态倾向测试 - 第一阶段';
  document.querySelector('.section-header p').textContent = `共${STAGE1_QUESTIONS}题，每道题都涉及经济、文化、权力集中度三个维度中的一个`;

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  const saved = answers.get(currentQuestionIndex);
  
  question.options.forEach((opt, idx) => {
    const optionId = `q${currentQuestionIndex}_opt${idx}`;
    const wrap = document.createElement('label');
    wrap.className = 'option';
    wrap.setAttribute('for', optionId);

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `q${currentQuestionIndex}`;
    input.id = optionId;
    input.value = String(idx);
    if (saved && saved.selectedIndex === idx) input.checked = true;
    input.addEventListener('change', () => {
      // 存储选择的选项索引和对应的分值
      answers.set(currentQuestionIndex, { 
        selectedIndex: idx,
        score: opt.score,
        axis: question.axis
      });
      updateStage1Scores();
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

function renderStage2Question() {
  const questions = stage2Questions[determinedCategory];
  if (!questions) {
    console.error('未找到第二阶段题目:', determinedCategory);
    document.getElementById('questionTitle').textContent = '未找到对应的第二阶段题目';
    return;
  }
  
  const questionIndex = currentQuestionIndex - STAGE1_QUESTIONS;
  const question = questions[questionIndex];
  
  if (!question) {
    console.error('题目索引超出范围:', questionIndex, '总题目数:', questions.length);
    document.getElementById('questionTitle').textContent = '题目索引超出范围';
    return;
  }
  
  document.getElementById('questionTitle').textContent = question.question || '（无题目）';
  
  // 更新页面标题
  document.querySelector('.section-header h2').textContent = `意识形态倾向测试 - 第二阶段 (${determinedCategory})`;
  document.querySelector('.section-header p').textContent = `共${STAGE2_QUESTIONS}题，进一步确定您的具体意识形态倾向`;

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  const saved = answers.get(currentQuestionIndex);
  
  question.options.forEach((opt, idx) => {
    const optionId = `q${currentQuestionIndex}_opt${idx}`;
    const wrap = document.createElement('label');
    wrap.className = 'option';
    wrap.setAttribute('for', optionId);

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `q${currentQuestionIndex}`;
    input.id = optionId;
    input.value = String(idx);
    if (saved && saved.selectedIndex === idx) input.checked = true;
    input.addEventListener('change', () => {
      // 存储选择的选项索引
      answers.set(currentQuestionIndex, { 
        selectedIndex: idx
      });
      
      // 如果是第二阶段，更新意识形态得分
      if (currentStage === 2) {
        updateStage2Scores();
      }
      
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

function updateStage1Scores() {
  stage1Scores = { economic: 0, culture: 0, authority: 0 };
  
  for (let i = 0; i < STAGE1_QUESTIONS; i++) {
    const answer = answers.get(i);
    if (answer && answer.axis && answer.score !== undefined) {
      stage1Scores[answer.axis] += answer.score;
    }
  }
}

function updateStage2Scores() {
  // 重置第二阶段得分
  stage2Scores.clear();
  
  // 获取当前大类的题目
  const questions = stage2Questions[determinedCategory];
  if (!questions) return;
  
  // 计算每个意识形态的得分
  for (let i = STAGE1_QUESTIONS; i < STAGE1_QUESTIONS + STAGE2_QUESTIONS; i++) {
    const answer = answers.get(i);
    if (answer && answer.selectedIndex !== undefined) {
      const questionIndex = i - STAGE1_QUESTIONS;
      const question = questions[questionIndex];
      
      if (question && question.options && question.options[answer.selectedIndex]) {
        const selectedOption = question.options[answer.selectedIndex];
        
        // 如果选项有ideology_scores，则使用新的计分方式
        if (selectedOption.ideology_scores) {
          for (const [ideology, score] of Object.entries(selectedOption.ideology_scores)) {
            if (!stage2Scores.has(ideology)) {
              stage2Scores.set(ideology, 0);
            }
            stage2Scores.set(ideology, stage2Scores.get(ideology) + score);
          }
        }
        // 兼容旧的计分方式（如果存在）
        else if (selectedOption.score !== undefined && question.ideology_terms) {
          question.ideology_terms.forEach(term => {
            if (!stage2Scores.has(term)) {
              stage2Scores.set(term, 0);
            }
            stage2Scores.set(term, stage2Scores.get(term) + selectedOption.score);
          });
        }
      }
    }
  }
}

function determineIdeology() {
  // 根据第二阶段得分确定具体意识形态
  let bestMatch = null;
  let bestScore = -Infinity;
  
  for (const [ideology, score] of stage2Scores) {
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ideology;
    }
  }
  
  return bestMatch || "未确定";
}

function calculateStage1MatchQuality() {
  // 计算Stage1的匹配质量，基于与确定大类的匹配程度
  if (!determinedCategory || !ideologyCategories[determinedCategory]) {
    return 60; // 默认基础匹配度
  }
  
  const category = ideologyCategories[determinedCategory];
  const ranges = category.ranges;
  
  // 检查是否在范围内
  const inEconomicRange = stage1Scores.economic >= ranges.economic[0] && stage1Scores.economic <= ranges.economic[1];
  const inCultureRange = stage1Scores.culture >= ranges.culture[0] && stage1Scores.culture <= ranges.culture[1];
  const inAuthorityRange = stage1Scores.authority >= ranges.authority[0] && stage1Scores.authority <= ranges.authority[1];
  
  if (inEconomicRange && inCultureRange && inAuthorityRange) {
    // 完全匹配，计算距离中心的分数
    const econCenter = (ranges.economic[0] + ranges.economic[1]) / 2;
    const cultCenter = (ranges.culture[0] + ranges.culture[1]) / 2;
    const authCenter = (ranges.authority[0] + ranges.authority[1]) / 2;
    
    const distance = Math.sqrt(
      Math.pow(stage1Scores.economic - econCenter, 2) +
      Math.pow(stage1Scores.culture - cultCenter, 2) +
      Math.pow(stage1Scores.authority - authCenter, 2)
    );
    
    // 距离越近，匹配质量越高（70-85%）
    return Math.max(70, Math.round(85 - distance * 2));
  } else {
    // 部分匹配，根据匹配的维度数量计算
    let matchCount = 0;
    if (inEconomicRange) matchCount++;
    if (inCultureRange) matchCount++;
    if (inAuthorityRange) matchCount++;
    
    // 根据匹配维度数量计算匹配质量（60-75%）
    return 60 + (matchCount * 5);
  }
}

function calculateMaxPossibleScore() {
  // 计算最大可能得分
  const questions = stage2Questions[determinedCategory];
  if (!questions) return 0;
  
  // 为每个意识形态计算最大可能得分
  const ideologyMaxScores = new Map();
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (question && question.options) {
      for (const option of question.options) {
        if (option.ideology_scores) {
          for (const [ideology, score] of Object.entries(option.ideology_scores)) {
            if (score > 0) {
              if (!ideologyMaxScores.has(ideology)) {
                ideologyMaxScores.set(ideology, 0);
              }
              ideologyMaxScores.set(ideology, ideologyMaxScores.get(ideology) + score);
            }
          }
        }
        // 兼容旧格式
        else if (option.score !== undefined && option.score > 0 && question.ideology_terms) {
          question.ideology_terms.forEach(term => {
            if (!ideologyMaxScores.has(term)) {
              ideologyMaxScores.set(term, 0);
            }
            ideologyMaxScores.set(term, ideologyMaxScores.get(term) + option.score);
          });
        }
      }
    }
  }
  
  // 返回所有意识形态中的最大可能得分
  let maxScore = 0;
  for (const score of ideologyMaxScores.values()) {
    maxScore = Math.max(maxScore, score);
  }
  
  return maxScore;
}

function updateQuizProgress() {
  let currentTotal, currentQuestionNum;
  
  if (currentStage === 1) {
    currentTotal = STAGE1_QUESTIONS;
    currentQuestionNum = currentQuestionIndex + 1;
  } else {
    currentTotal = STAGE2_QUESTIONS;
    currentQuestionNum = currentQuestionIndex - STAGE1_QUESTIONS + 1;
  }
  
  const pct = Math.round((currentQuestionNum / currentTotal) * 100);
  document.getElementById('progressBar').style.width = pct + '%';
  
  const stageText = currentStage === 1 ? '第一阶段' : '第二阶段';
  document.getElementById('pageIndicator').textContent = `${stageText} 第 ${currentQuestionNum} / ${currentTotal} 题`;
  
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  
  btnPrev.disabled = currentQuestionIndex === 0;
  
  if (currentStage === 1) {
    btnNext.textContent = currentQuestionIndex === STAGE1_QUESTIONS - 1 ? '进入第二阶段 ' : '下一题 ';
  } else {
    btnNext.textContent = currentQuestionIndex === STAGE1_QUESTIONS + STAGE2_QUESTIONS - 1 ? '查看结果 ' : '下一题 ';
  }
  
  if (!btnNext.querySelector('i')) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-arrow-right';
    btnNext.appendChild(icon);
  }
}

function renderLiveScores() {
  const liveScores = document.getElementById('liveScores');
  liveScores.innerHTML = '';
  
  if (currentStage === 1) {
    liveScores.appendChild(makeBadge(`${AXIS_LABEL.economic}: ${stage1Scores.economic}`));
    liveScores.appendChild(makeBadge(`${AXIS_LABEL.culture}: ${stage1Scores.culture}`));
    liveScores.appendChild(makeBadge(`${AXIS_LABEL.authority}: ${stage1Scores.authority}`));
  } else {
    liveScores.appendChild(makeBadge(`已确定大类: ${determinedCategory}`));
  }
}

function makeBadge(text) {
  const el = document.createElement('span');
  el.className = 'badge';
  el.textContent = text;
  return el;
}

function calculateAllMatches() {
  // 计算所有意识形态的匹配程度
  const matches = [];
  
  for (const [categoryName, category] of Object.entries(ideologyCategories)) {
    const ranges = category.ranges;
    let score = 0;
    let matchDetails = {
      economic: 0,
      culture: 0,
      authority: 0
    };
    
    // 检查是否在范围内
    const inEconomicRange = stage1Scores.economic >= ranges.economic[0] && stage1Scores.economic <= ranges.economic[1];
    const inCultureRange = stage1Scores.culture >= ranges.culture[0] && stage1Scores.culture <= ranges.culture[1];
    const inAuthorityRange = stage1Scores.authority >= ranges.authority[0] && stage1Scores.authority <= ranges.authority[1];
    
    if (inEconomicRange && inCultureRange && inAuthorityRange) {
      // 完全匹配，计算距离中心的分数
      const econCenter = (ranges.economic[0] + ranges.economic[1]) / 2;
      const cultCenter = (ranges.culture[0] + ranges.culture[1]) / 2;
      const authCenter = (ranges.authority[0] + ranges.authority[1]) / 2;
      
      const distance = Math.sqrt(
        Math.pow(stage1Scores.economic - econCenter, 2) +
        Math.pow(stage1Scores.culture - cultCenter, 2) +
        Math.pow(stage1Scores.authority - authCenter, 2)
      );
      
      score = 1000 - distance; // 距离越近分数越高
      matchDetails.economic = 100;
      matchDetails.culture = 100;
      matchDetails.authority = 100;
    } else {
      // 部分匹配，计算匹配程度
      let matchScore = 0;
      if (inEconomicRange) {
        matchScore += 1;
        matchDetails.economic = 100;
      } else {
        // 计算距离范围的程度
        const econDistance = Math.min(
          Math.abs(stage1Scores.economic - ranges.economic[0]),
          Math.abs(stage1Scores.economic - ranges.economic[1])
        );
        matchDetails.economic = Math.max(0, 100 - econDistance * 10);
      }
      
      if (inCultureRange) {
        matchScore += 1;
        matchDetails.culture = 100;
      } else {
        const cultDistance = Math.min(
          Math.abs(stage1Scores.culture - ranges.culture[0]),
          Math.abs(stage1Scores.culture - ranges.culture[1])
        );
        matchDetails.culture = Math.max(0, 100 - cultDistance * 10);
      }
      
      if (inAuthorityRange) {
        matchScore += 1;
        matchDetails.authority = 100;
      } else {
        const authDistance = Math.min(
          Math.abs(stage1Scores.authority - ranges.authority[0]),
          Math.abs(stage1Scores.authority - ranges.authority[1])
        );
        matchDetails.authority = Math.max(0, 100 - authDistance * 10);
      }
      
      score = matchScore * 100 + (matchDetails.economic + matchDetails.culture + matchDetails.authority) / 3;
    }
    
    matches.push({
      name: categoryName,
      score: score,
      matchDetails: matchDetails,
      category: category
    });
  }
  
  // 按分数排序
  matches.sort((a, b) => b.score - a.score);
  
  return matches;
}

function determineCategory() {
  const matches = calculateAllMatches();
  return matches[0].name;
}

function nextOrSubmit() {
  // 未选择选项时禁止进入下一题/提交
  if (!answers.get(currentQuestionIndex)) {
    alert('请先选择一个选项再继续。');
    return;
  }
  
  if (currentStage === 1) {
    // 第一阶段逻辑
    if (currentQuestionIndex < STAGE1_QUESTIONS - 1) {
      currentQuestionIndex++;
      saveData();
      renderStage1Question();
    } else {
      // 第一阶段完成，确定大类并进入第二阶段
      determinedCategory = determineCategory();
      console.log('确定的大类:', determinedCategory);
      currentStage = 2;
      currentQuestionIndex = STAGE1_QUESTIONS; // 从第16题开始
      saveData();
      renderStage2Question();
    }
  } else {
    // 第二阶段逻辑
    if (currentQuestionIndex < STAGE1_QUESTIONS + STAGE2_QUESTIONS - 1) {
      currentQuestionIndex++;
      saveData();
      renderStage2Question();
    } else {
      // 第二阶段完成，确定具体意识形态并显示最终结果
      updateStage2Scores();
      determinedIdeology = determineIdeology();
      console.log('确定的意识形态:', determinedIdeology);
      console.log('意识形态得分:', Object.fromEntries(stage2Scores));
      showFinalResults();
    }
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    saveData();
    if (currentStage === 1) {
      renderStage1Question();
    } else {
      renderStage2Question();
    }
  } else if (currentStage === 2) {
    // 从第二阶段回到第一阶段
    currentStage = 1;
    currentQuestionIndex = STAGE1_QUESTIONS - 1;
    saveData();
    renderStage1Question();
  }
}

function showFinalResults() {
  // 计算意识形态匹配度
  const ideologyScores = Array.from(stage2Scores.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const topIdeology = ideologyScores[0];
  const topIdeologyName = topIdeology ? topIdeology[0] : "未确定";
  const topIdeologyScore = topIdeology ? topIdeology[1] : 0;
  
  // 计算匹配度百分比（结合Stage1和Stage2）
  const stage1MatchQuality = calculateStage1MatchQuality(); // 计算Stage1的匹配质量
  const baseMatchPercentage = Math.max(60, Math.min(85, Math.round(stage1MatchQuality))); // 基础匹配度60-85%，确保整数
  const stage2MaxScore = calculateMaxPossibleScore();
  const stage2MatchPercentage = stage2MaxScore > 0 ? Math.round((topIdeologyScore / stage2MaxScore) * (100 - baseMatchPercentage)) : 0; // Stage2贡献剩余部分
  const matchPercentage = Math.min(100, Math.round(baseMatchPercentage + stage2MatchPercentage)); // 确保最终结果是整数
  
  // 调试信息
  console.log('匹配度计算详情:');
  console.log('Stage1匹配质量:', stage1MatchQuality);
  console.log('基础匹配度:', baseMatchPercentage);
  console.log('Stage2最高得分:', topIdeologyScore);
  console.log('Stage2最大可能得分:', stage2MaxScore);
  console.log('Stage2调整值:', stage2MatchPercentage);
  console.log('最终匹配度:', matchPercentage);
  
  // 显示意识形态结果
  const finalIdeology = document.getElementById('finalIdeology');
  finalIdeology.innerHTML = '';
  
  // 主要结果卡片
  const mainResultCard = document.createElement('div');
  mainResultCard.className = 'main-result-card';
  mainResultCard.innerHTML = `
    <div class="result-header">
      <h2>您的意识形态倾向</h2>
      <div class="match-score">匹配度: ${matchPercentage}%</div>
    </div>
    <div class="result-title">${topIdeologyName}</div>
    <div class="result-description">您属于 ${determinedCategory} 大类下的 ${topIdeologyName} 意识形态</div>
  `;
  finalIdeology.appendChild(mainResultCard);
  
  // 其他可能的意识形态
  if (ideologyScores.length > 1) {
    const otherMatchesCard = document.createElement('div');
    otherMatchesCard.className = 'other-matches-card';
    otherMatchesCard.innerHTML = `
      <h3>其他可能的意识形态</h3>
      <div class="other-matches-list">
        ${ideologyScores.slice(1, 4).map(([ideology, score]) => {
          const otherStage2MatchPercentage = stage2MaxScore > 0 ? Math.round((score / stage2MaxScore) * (100 - baseMatchPercentage)) : 0;
          const otherMatchPercentage = Math.min(100, Math.round(baseMatchPercentage + otherStage2MatchPercentage));
          return `
          <div class="other-match-item">
            <div class="other-match-name">${ideology}</div>
            <div class="other-match-score">匹配度: ${otherMatchPercentage}%</div>
          </div>
        `;
        }).join('')}
      </div>
    `;
    finalIdeology.appendChild(otherMatchesCard);
  }
  
  // 隐藏测试页面，显示结果页面
  document.getElementById('quizPage').style.display = 'none';
  document.getElementById('resultPage').style.display = 'block';
  document.getElementById('progressBar').style.width = '100%';
  
  // 自动提交数据到服务器
  submitCompleteData(stage1Scores, topIdeologyName);
}

function restartSurvey() {
  // 重置所有状态
  currentStage = 1;
  currentQuestionIndex = 0;
  answers.clear();
  stage1Scores = { economic: 0, culture: 0, authority: 0 };
  determinedCategory = null;
  
  // 显示测试页面
  document.getElementById('quizPage').style.display = 'block';
  document.getElementById('resultPage').style.display = 'none';
  
  // 重新开始测试
  loadQuestionsAndStart();
  
  // 清除本地存储
  localStorage.removeItem('quizAnswers');
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
      if (!answers.get(currentQuestionIndex)) {
        alert('请先选择一个选项再继续。');
        return;
      }
      const btnNext = document.getElementById('btnNext');
      if (!btnNext.disabled) nextOrSubmit();
    }
  }
});

// 数据提交函数
function submitCompleteData(scores, ideologyName) {
  const formData = new FormData();
  
  // 添加意识形态测试结果
  formData.append('ideology_name', ideologyName);
  formData.append('economic_score', scores.economic.toString());
  formData.append('culture_score', scores.culture.toString());
  formData.append('authority_score', scores.authority.toString());
  
  // 添加时间戳
  formData.append('start_time', localStorage.getItem('surveyStartTime') || '未知');
  formData.append('end_time', new Date().toLocaleString());
  formData.append('submit_time', new Date().toLocaleString());
  
  // 添加测试完成标识
  formData.append('test_completed', 'true');
  formData.append('test_type', 'two_stage');
  
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
  
  // 提交到服务器
  fetch('https://formcarry.com/s/Ef13ZVrZcrl', {
    method: 'POST',
    body: formData
  }).then(res => {
    if(res.ok) {
      logEl.textContent = '数据提交成功 ✅';
      btnRestart.innerHTML = originalText;
      btnRestart.disabled = false;
      localStorage.removeItem('quizAnswers');
      localStorage.removeItem('surveyStartTime');
    } else {
      logEl.textContent = '提交失败 ❌';
      throw new Error('网络错误');
    }
  }).catch(() => {
    logEl.textContent = '数据已经在路上了 ✅，网络不通畅可能会导致延迟';
    btnRestart.innerHTML = originalText;
    btnRestart.disabled = false;
    localStorage.removeItem('quizAnswers');
    localStorage.removeItem('surveyStartTime');
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
