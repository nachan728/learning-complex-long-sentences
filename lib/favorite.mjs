export function validFavorite(payload) {
 const s=payload?.sentence,l=payload?.lesson;
 const str=x=>typeof x==='string'&&x.length>0&&x.length<=10000;
 return Boolean(s&&l&&['text','translation','skeleton','type','logic','pitfall'].every(k=>str(s[k]))&&Array.isArray(s.layers)&&s.layers.length>0&&s.layers.length<=12&&s.layers.every(v=>str(v.text)&&str(v.role))&&str(l.title)&&Array.isArray(l.paragraphs)&&l.paragraphs.length<=10&&l.paragraphs.every(str)&&JSON.stringify(payload).length<=100000);
}
