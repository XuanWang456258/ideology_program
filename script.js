let currentPage = 1;
const totalPages = 4;

// 初始化函数
function init() {
  updateProgressBar();
  document.getElementById('startTime').value = new Date().toLocaleString();

  // 获取用户IP
  fetch("https://api.ipify.org?format=json")
    .then(res => res.json())
    .then(data => { 
      document.getElementById('ipField').value = data.ip; 
    })
    .catch(() => {
      document.getElementById('ipField').value = "无法获取IP地址";
    });

  // 恢复本地存储
  restoreData();

  // 监听输入以保存数据
  document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('input', debounce(saveData, 1000));
  });

  // 下拉 + 其他输入框逻辑
  document.querySelectorAll('.select-other').forEach(group => {
    const select = group.querySelector('select');
    const otherInput = group.querySelector('input[type="text"]');
    select.addEventListener('change', () => {
      if (select.value !== 'other') {
        otherInput.style.display = 'none';
        otherInput.value = '';
      } else {
        otherInput.style.display = 'block';
        otherInput.focus();
      }
    });
  });

  // 国家-省-市联动
  setupLocationDependency();
}

// 翻页
function showPage(pageNum) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`page${pageNum}`).style.display = 'block';
  currentPage = pageNum;
  updateProgressBar();
}

// 更新进度条
function updateProgressBar() {
  const progress = ((currentPage - 1) / (totalPages - 1)) * 100;
  document.getElementById('progressBar').style.width = `${progress}%`;
}

// 防抖
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 保存数据
function saveData() {
  const formData = {};
  document.querySelectorAll('input, select, textarea').forEach(element => {
    if (element.name) {
      // 下拉+其他输入框归一化
      const parent = element.closest('.select-other');
      if (parent) {
        const select = parent.querySelector('select');
        const otherInput = parent.querySelector('input[type="text"]');
        formData[select.name] = (select.value === 'other' ? otherInput.value : select.value);
      } else {
        formData[element.name] = element.value;
      }
    }
  });
  localStorage.setItem('questionnaireData', JSON.stringify(formData));

  const indicator = document.getElementById('saveIndicator');
  indicator.style.opacity = '1';
  setTimeout(() => indicator.style.opacity = '0', 2000);
}

// 恢复数据
function restoreData() {
  const savedData = localStorage.getItem('questionnaireData');
  if (!savedData) return;
  const formData = JSON.parse(savedData);
  for (const [key, value] of Object.entries(formData)) {
    const element = document.querySelector(`[name="${key}"]`);
    if (!element) continue;

    const parent = element.closest('.select-other');
    if (parent) {
      const select = parent.querySelector('select');
      const otherInput = parent.querySelector('input[type="text"]');
      if (Object.values(select.options).some(opt => opt.value === value)) {
        select.value = value;
        otherInput.style.display = 'none';
      } else {
        select.value = 'other';
        otherInput.value = value;
        otherInput.style.display = 'block';
      }
    } else {
      element.value = value;
    }
  }
}

// 检查必填并提交
function checkRequiredAndSubmit() {
  const requiredFields = document.querySelectorAll('.page input[required], .page select[required], .page textarea[required]');
  let allValid = true;
  requiredFields.forEach(field => {
    let value = field.value.trim();
    const parent = field.closest('.select-other');
    if (parent) {
      const select = parent.querySelector('select');
      const otherInput = parent.querySelector('input[type="text"]');
      value = (select.value === 'other' ? otherInput.value.trim() : select.value);
    }
    if (!value) {
      allValid = false;
    }
  });

  if (!allValid) {
    alert('还有必填问题未完成，请检查后提交。');
    return;
  }

  submitForm();
}

// 提交表单
function submitForm() {
  const formData = new FormData();
  document.querySelectorAll('input, select, textarea').forEach(element => {
    if (element.name) {
      const parent = element.closest('.select-other');
      if (parent) {
        const select = parent.querySelector('select');
        const otherInput = parent.querySelector('input[type="text"]');
        formData.append(select.name, (select.value === 'other' ? otherInput.value : select.value));
      } else {
        formData.append(element.name, element.value);
      }
    }
  });

  formData.append('submit_time', new Date().toLocaleString());

  const submitBtn = document.querySelector('.btn-submit');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
  submitBtn.disabled = true;

  fetch('https://formcarry.com/s/Ef13ZVrZcrl', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    // 即使返回网络异常，也显示感谢页
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('thankYou').style.display = 'block';
    document.getElementById('progressBar').style.width = '100%';
    localStorage.removeItem('questionnaireData');
  })
  .catch(error => {
    console.error('Error:', error);
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('thankYou').style.display = 'block';
    document.getElementById('progressBar').style.width = '100%';
    localStorage.removeItem('questionnaireData');
  });
}

// 国家-省-市联动示例
function setupLocationDependency() {
  const countrySelect = document.getElementById('country');
  const stateGroup = document.getElementById('stateGroup');
  const cityGroup = document.getElementById('cityGroup');
  const stateSelect = document.getElementById('state');
  const citySelect = document.getElementById('city');

  countrySelect.addEventListener('change', () => {
    stateGroup.style.display = (countrySelect.value === 'unknown') ? 'none' : 'block';
    stateSelect.value = '';
    cityGroup.style.display = 'none';
    citySelect.value = '';
  });

  stateSelect.addEventListener('change', () => {
    cityGroup.style.display = (stateSelect.value) ? 'block' : 'none';
    citySelect.value = '';
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', init);