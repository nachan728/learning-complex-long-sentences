(() => {
 const dialog=document.createElement('dialog');dialog.className='word-dialog';
 const heading=document.createElement('h2'),content=document.createElement('div'),close=document.createElement('button');close.textContent='关闭';close.onclick=()=>dialog.close();dialog.append(heading,content,close);document.body.append(dialog);
 let request=0;
 const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
 function tokenize(){
  document.querySelectorAll('.article p,.english,.article-title').forEach(region=>{
   const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement.closest('button')&&/[a-z]/i.test(node.textContent))nodes.push(node);}
   for(const node of nodes){const fragment=document.createDocumentFragment();let last=0;for(const match of node.textContent.matchAll(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g)){fragment.append(document.createTextNode(node.textContent.slice(last,match.index)));const b=text('button',match[0]);b.type='button';b.className='lookup-word';b.setAttribute('aria-label',`查看 ${match[0]} 的词义和搭配`);b.dataset.word=match[0];fragment.append(b);last=match.index+match[0].length;}fragment.append(document.createTextNode(node.textContent.slice(last)));node.replaceWith(fragment);}
  });
 }
 const pending=new Map(),cache=new Map();
 document.addEventListener('click',async event=>{
  const b=event.target.closest('.lookup-word');if(!b)return;
  const id=++request,word=b.dataset.word.toLowerCase(),region=b.closest('p,.english,.article-title'),raw=region.textContent,offset=Math.max(0,raw.toLowerCase().indexOf(word));const context=raw.slice(Math.max(0,offset-1500),offset+4000);
  heading.textContent=b.dataset.word;content.replaceChildren(text('p','正在查询语境词义和常见搭配…'));if(!dialog.open)dialog.showModal();
  try{
   const identity=await fetch('/api/me').then(r=>r.json());if(!identity.user)throw new Error('请先登录，再查询词义和常见搭配。');
   const key=JSON.stringify([identity.user.id,word,context]);
   if(!cache.has(key)){
    if(!pending.has(key))pending.set(key,fetch('/api/dictionary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word,context})}).then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.error||'查询失败');cache.set(key,value);return value;}).finally(()=>pending.delete(key)));
    await pending.get(key);
   }
   if(id!==request||!dialog.open)return;const entry=cache.get(key);content.replaceChildren(text('h3','这里的意思'),text('p',entry.meaning),text('h3','常见搭配'));
   const list=document.createElement('ul');for(const c of entry.collocations){const li=document.createElement('li');li.append(text('strong',c.phrase),text('p',c.meaning));list.append(li);}content.append(list,text('p','释义由当前账号的模型提供，仅供学习参考；首次查询会使用 API 额度，结果按账号缓存。'));
  }catch(error){if(id===request)content.replaceChildren(text('p',error.message));}
 });
 dialog.addEventListener('close',()=>{request++;});
 const observer=new MutationObserver(()=>{observer.disconnect();tokenize();observer.observe(document.querySelector('main'),{subtree:true,childList:true});});observer.observe(document.querySelector('main'),{subtree:true,childList:true});tokenize();
})();
