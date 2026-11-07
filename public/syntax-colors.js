// 使用已有分析片段定位原文，不根据连接词猜测语法。
function syntaxKind(role){
 if(/同位语从句|内容从句/.test(role))return 'content';
 if(/定语从句|关系从句/.test(role))return 'relative';
 if(/状语从句|让步|条件|原因|时间从句/.test(role))return 'adverbial';
 if(/宾语从句|表语从句|主语从句/.test(role))return 'nominal';
 if(/插入|同位说明/.test(role))return 'aside';
 if(/分词|不定式|非谓语/.test(role))return 'nonfinite';
 if(/主句|主干|并列句/.test(role))return 'main';
 return 'modifier';
}
const syntaxLabels={main:'主句 / 主干',relative:'定语从句',content:'同位语 / 内容从句',adverbial:'状语从句',nominal:'主语 / 宾语 / 表语从句',nonfinite:'非谓语结构',aside:'插入说明',modifier:'其他修饰成分'};
function syntaxSentence(sentence){
 const p=document.createElement('p');p.className='english syntax-sentence';
 const source=sentence.text;
 const ranges=(sentence.layers||[]).flatMap((layer,index)=>{const start=source.indexOf(layer.text);return start<0||!layer.text?[]:[{start,end:start+layer.text.length,kind:syntaxKind(layer.role),role:layer.role,index}];});
 const boundaries=[...new Set([0,source.length,...ranges.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b);
 for(let i=0;i<boundaries.length-1;i++){
  const a=boundaries[i],b=boundaries[i+1];
  const covering=ranges.filter(r=>r.start<=a&&r.end>=b).sort((x,y)=>(y.end-y.start)-(x.end-x.start)||x.index-y.index);
  let parent=p;
  // 外层下划线保留所属关系，最内层背景显示当前成分。
  for(const r of covering){const span=document.createElement('span');span.className=`syntax-part syntax-${r.kind}`;span.title=r.role;parent.append(span);parent=span;}
  if(!covering.length){const span=document.createElement('span');span.className='syntax-part syntax-main';span.title='未被分析片段覆盖的主句文字（以主干分析为准）';parent.append(span);parent=span;}
  parent.append(document.createTextNode(source.slice(a,b)));
 }
 return p;
}
function syntaxLegend(){const legend=document.createElement('div');legend.className='syntax-legend';legend.setAttribute('aria-label','句子成分颜色图例');for(const [kind,label]of Object.entries(syntaxLabels)){const item=document.createElement('span');item.className=`syntax-part syntax-${kind}`;item.textContent=label;legend.append(item);}const note=document.createElement('small');note.textContent='颜色依据分析片段；嵌套结构同时保留外层下划线。悬停可查看作用，具体归属以分层说明为准。';legend.append(note);return legend;}
