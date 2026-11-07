(() => {
 const trigger=document.querySelector('#account');
 const menu=document.createElement('dialog');menu.className='account-dialog';menu.setAttribute('aria-label','账号设置');
 const heading=document.createElement('h2');heading.textContent='当前账号';
 const email=document.createElement('p');email.className='muted';
 const close=document.createElement('button');close.type='button';close.textContent='返回学习';close.onclick=()=>menu.close();
 const logout=document.createElement('button');logout.type='button';logout.textContent='退出登录';logout.className='logout-action';
 const settings=document.querySelector('#keySettings');
 const openSettings=settings.onclick;
 settings.onclick=async event=>{menu.close();await openSettings.call(settings,event);};
 menu.append(heading,email,settings,close,logout);document.body.append(menu);
 // 保留原有登录、退出及缓存清理逻辑，只在账号菜单中明确确认后调用。
 const original=trigger.onclick;
 trigger.onclick=async event=>{
  try{const r=await fetch('/api/me',{credentials:'same-origin'});if(!r.ok)throw new Error('无法获取账号状态，请稍后重试。');const state=await r.json();if(!state.user){await original.call(trigger,event);return;}email.textContent=state.user.email;menu.showModal();}
  catch(error){tell(error.message);}
 };
 logout.onclick=async event=>{if(!confirm('确定退出当前账号吗？此设备上的收藏缓存将清除，已保存的收藏和笔记仍保留在账号中。'))return;menu.close();await original.call(trigger,event);};
 const label=()=>{if(trigger.textContent==='退出登录')trigger.textContent='我的账号';};
 new MutationObserver(label).observe(trigger,{childList:true,characterData:true,subtree:true});label();
})();
