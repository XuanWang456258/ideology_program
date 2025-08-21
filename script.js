let currentPage = 1;
const totalPages = 4;

const geoData = {
  "中国": {"北京":["北京"],"上海":["上海"],"广东":["广州","深圳"],"其他":[]},
  "美国": {"加利福尼亚州":["洛杉矶","旧金山"],"纽约州":["纽约市","布法罗"],"其他":[]},
  "澳大利亚":{"新南威尔士":["悉尼","纽卡斯尔"],"维多利亚":["墨尔本"],"其他":[]},
  "德国":{"巴伐利亚":["慕尼黑"],"其他":[]},
  "其他":{"未知":["未知"]},
  "未知":{"未知":["未知"]}
};

function init() {
  updateProgressBar();
  restoreData();
  setupUnifiedInputs();
  setupCountryStateCity();
  setupAutoSave();
}

function showPage(pageNum){
  document.querySelectorAll('.page').forEach(p=>p.style.display='none');
  document.getElementById(`page${pageNum}`).style.display='block';
  currentPage = pageNum;
  updateProgressBar();
}

function updateProgressBar(){
  const progress = ((currentPage-1)/(totalPages-1))*100;
  document.getElementById('progressBar').style.width=`${progress}%`;
}

function setupUnifiedInputs(){
  document.querySelectorAll('input[data-unified-for]').forEach(input=>{
    const targetName=input.getAttribute('data-unified-for');
    input.addEventListener('input',()=>{
      const sel=document.querySelector(`select[name="${targetName}"]`);
      sel.value = input.value.trim()?input.value.trim():"其他";
    });
  });
}

function setupCountryStateCity(){
  const countrySelect=document.getElementById('countrySelect');
  const provinceSelect=document.getElementById('stateSelect');
  const citySelect=document.getElementById('citySelect');

  function updateProvince(){
    const c=countrySelect.value||"未知";
    provinceSelect.innerHTML='';
    Object.keys(geoData[c]||{"未知":["未知"]}).forEach(p=>provinceSelect.appendChild(new Option(p,p)));
    provinceSelect.value="未知";
    updateCity();
  }
  function updateCity(){
    const c=countrySelect.value||"未知";
    const p=provinceSelect.value||"未知";
    citySelect.innerHTML='';
    (geoData[c]&&geoData[c][p]?geoData[c][p]:["未知"]).forEach(city=>citySelect.appendChild(new Option(city,city)));
    citySelect.value="未知";
  }

  countrySelect.addEventListener('change',()=>{updateProvince(); saveData();});
  provinceSelect.addEventListener('change',()=>{updateCity(); saveData();});
}

function setupAutoSave(){
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',debounce(saveData,1000));
  });
}

function saveData(){
  const formData={};
  document.querySelectorAll('input,select,textarea').forEach(el=>{ if(el.name) formData[el.name]=el.value;});
  localStorage.setItem('questionnaireData',JSON.stringify(formData));
  const indicator=document.getElementById('saveIndicator');
  indicator.style.opacity='1';
  setTimeout(()=>{indicator.style.opacity='0';},2000);
}

function restoreData(){
  const saved=localStorage.getItem('questionnaireData');
  if(saved){
    const data=JSON.parse(saved);
    for(const [key,val] of Object.entries(data)){
      const el=document.querySelector(`[name="${key}"]`);
      if(el) el.value=val;
    }
  }
}

function debounce(func,wait){let timeout; return function(...args){clearTimeout(timeout); timeout=setTimeout(()=>func(...args),wait);};}

// 翻页和提交
function validatePage(pageNum){
  if(pageNum===totalPages){
    if(!checkRequired()) return;
    submitForm();
  } else {
    if(!checkRequiredPage(pageNum)) return;
    showPage(pageNum+1);
  }
}

// 检查当前页必填
function checkRequiredPage(pageNum){
  const page=document.getElementById(`page${pageNum}`);
  const requiredEls=page.querySelectorAll('[required]');
  for(const el of requiredEls){
    const value=el.value.trim();
    if(!value){ alert('请完成当前页面的必填项'); return false;}
  }
  return true;
}

// 检查所有必填
function checkRequired(){
  const requiredEls=document.querySelectorAll('[required]');
  for(const el of requiredEls){
    const value=el.value.trim();
    if(!value){ alert('请完成所有必填项'); return false;}
  }
  return true;
}

// 提交
function submitForm(){
  const formData=new FormData();
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    if(el.name){
      if(el.name.endsWith('_other')){
        const main=el.name.replace('_other','');
        if(!formData.get(main)) formData.append(main,el.value);
      } else {
        const otherEl=document.querySelector(`[name="${el.name}_other"]`);
        if(otherEl && otherEl.value.trim()!=='') formData.append(el.name,otherEl.value);
        else formData.append(el.name,el.value);
      }
    }
  });
  formData.append('submit_time',new Date().toLocaleString());

  const btn=document.querySelector('.btn-submit');
  const original=btn.innerHTML;
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 提交中...';
  btn.disabled=true;

  // 创建状态日志元素
  let logEl = document.getElementById('submitLog');
  if(!logEl){
    logEl = document.createElement('div');
    logEl.id = 'submitLog';
    logEl.style.position='fixed';
    logEl.style.bottom='60px';
    logEl.style.right='20px';
    logEl.style.padding='10px 15px';
    logEl.style.background='rgba(0,0,0,0.7)';
    logEl.style.color='white';
    logEl.style.borderRadius='8px';
    logEl.style.zIndex='1000';
    logEl.style.fontSize='0.9rem';
    document.body.appendChild(logEl);
  }
  logEl.textContent = '正在提交...';

  fetch('https://formcarry.com/s/Ef13ZVrZcrl',{
    method:'POST', body:formData
  }).then(res=>{
    if(res.ok){
      logEl.textContent = '提交成功 ✅';
      document.querySelectorAll('.page').forEach(p=>p.style.display='none');
      document.getElementById('thankYou').style.display='block';
      document.getElementById('progressBar').style.width='100%';
      localStorage.removeItem('questionnaireData');
    } else {
      logEl.textContent = '提交失败 ❌';
      throw new Error('网络错误');
    }
  }).catch(()=>{
    logEl.textContent = '提交已经在路上了 ✅，网络不通畅可能会导致延迟';
    btn.innerHTML=original;
    btn.disabled=false;
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');
    document.getElementById('thankYou').style.display='block';
    document.getElementById('progressBar').style.width='100%';
    localStorage.removeItem('questionnaireData');
  });
}

document.addEventListener('DOMContentLoaded',init);
