(() => {
 const button=document.createElement('button');button.type='button';button.id='themeToggle';
 let stored;try{stored=localStorage.getItem('sentence-theme');}catch{}
 let dark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
 function render(){document.documentElement.dataset.theme=dark?'dark':'light';button.textContent=dark?'🌙':'☀️';button.setAttribute('aria-label',dark?'切换到浅色主题':'切换到深色主题');button.title=button.getAttribute('aria-label');button.setAttribute('aria-pressed',String(dark));document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#172338':'#2455bc');}
 let changed=false;
 button.onclick=()=>{changed=true;dark=!dark;render();const theme=dark?'dark':'light';try{localStorage.setItem('sentence-theme',theme);}catch{}fetch('/api/desktop-theme',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({theme}),keepalive:true}).catch(()=>{});};
 document.querySelector('nav').prepend(button);render();
 fetch('/api/desktop-theme').then(r=>r.ok?r.json():null).then(state=>{if(!changed&&state&&['dark','light'].includes(state.theme)){dark=state.theme==='dark';render();}}).catch(()=>{});
})();
