import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWords, systemPrompt, validateLesson } from './lib/lesson.mjs';
import { validFavorite } from './lib/favorite.mjs';
const scrypt=promisify(scryptCb), root=path.dirname(fileURLToPath(import.meta.url));
const dbPath=path.resolve(process.env.DATABASE_PATH||'./data/study.sqlite');
mkdirSync(path.dirname(dbPath),{recursive:true});
const db=new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS favorites(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),fingerprint TEXT NOT NULL,payload TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,fingerprint));`);
const hash=s=>createHash('sha256').update(s).digest('hex');
const limits=new Map();
function rate(key,max,windowMs){const now=Date.now();let item=limits.get(key);if(!item||item.until<now){item={n:0,until:now+windowMs};limits.set(key,item);}if(++item.n>max)throw Object.assign(new Error('请求较多，请稍后再试。'),{status:429});}
setInterval(()=>{for(const [k,v] of limits)if(v.until<Date.now())limits.delete(k);db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());},60000).unref();
function user(req){const token=req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]+)/)?.[1];return token?db.prepare('SELECT users.id, users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now()):null;}
function required(req){const u=user(req);if(!u)throw Object.assign(new Error('请先登录，收藏将保存在你的账号中。'),{status:401});return u;}
async function body(req){let bytes=0,chunks=[];for await(const c of req){bytes+=c.length;if(bytes>150000)throw Object.assign(new Error('提交内容过大。'),{status:413});chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw Object.assign(new Error('请求格式错误。'),{status:400});}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function generate(words,mode){
 if(!process.env.AI_API_KEY)throw Object.assign(new Error('尚未配置 DeepSeek 密钥。请先体验演示，或在服务端 .env.local 中填写 AI_API_KEY。'),{status:503});
 const response=await fetch(`${(process.env.AI_BASE_URL||'https://api.deepseek.com').replace(/\/$/,'')}/chat/completions`,{method:'POST',signal:AbortSignal.timeout(120000),headers:{Authorization:`Bearer ${process.env.AI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.AI_MODEL||'deepseek-flash',messages:[{role:'system',content:systemPrompt},{role:'user',content:JSON.stringify({words,length:mode==='full'?'400—450词':'180—250词'})}],response_format:{type:'json_object'},max_tokens:8000,stream:false})});
 if(!response.ok)throw Object.assign(new Error(response.status===401?'DeepSeek 密钥无效，请检查服务端配置。':response.status===402?'DeepSeek 余额不足，请在开放平台检查。':'DeepSeek 暂时无法完成请求，请稍后重试。'),{status:502});
 const result=await response.json();let lesson;try{lesson=JSON.parse(result.choices[0].message.content);}catch{throw new Error('模型返回格式错误，请重试。');}return validateLesson(lesson,words,mode);
}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 try{
 const url=new URL(req.url,'http://localhost'),p=url.pathname;
 if(p.startsWith('/api/')){
 if(req.method!=='GET'){
 const origin=req.headers.origin,expected=process.env.APP_ORIGIN||`http://${req.headers.host}`;
 if(origin&&origin!==expected) return json(res,403,{error:'来源校验失败。'});
 if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'需要 JSON 请求。'});
 }
 if(p==='/api/me'&&req.method==='GET')return json(res,200,{user:user(req),configured:Boolean(process.env.AI_API_KEY)});
 if(['/api/register','/api/login'].includes(p)&&req.method==='POST'){
 rate(`auth:${req.socket.remoteAddress}`,15,15*60000);const b=await body(req),email=String(b.email||'').trim().toLowerCase(),password=b.password;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<10||password.length>128)return json(res,400,{error:'请输入有效邮箱，密码长度为 10—128 个字符。'});
 let u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(p==='/api/register'){
 if(u)return json(res,409,{error:'无法创建账号，请尝试登录或更换邮箱。'});
 const salt=randomBytes(16).toString('hex'),key=await scrypt(password,salt,64);
 const r=db.prepare('INSERT INTO users(email,password) VALUES(?,?)').run(email,`${salt}:${key.toString('hex')}`);u={id:Number(r.lastInsertRowid),email};
 }else{const [salt,key]=(u?.password||`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');const candidate=await scrypt(password,salt,64);if(!u||!timingSafeEqual(Buffer.from(key,'hex'),candidate))return json(res,401,{error:'邮箱或密码不正确。'});}
 const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),u.id,Date.now()+30*86400000);
 res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return json(res,200,{user:{id:u.id,email:u.email}});
 }
 if(p==='/api/logout'&&req.method==='POST'){const token=req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return json(res,200,{ok:true});}
 if(p==='/api/generate'&&req.method==='POST'){const u=required(req);rate(`gen:${u.id}`,8,3600000);const b=await body(req),words=parseWords(b.words);return json(res,200,await generate(words,b.mode==='full'?'full':'daily'));}
 if(p==='/api/favorites'){
 const u=required(req);
 if(req.method==='GET')return json(res,200,{items:db.prepare('SELECT id,payload,note,created FROM favorites WHERE user_id=? ORDER BY id DESC').all(u.id).map(r=>({...r,payload:JSON.parse(r.payload)}))});
 if(req.method==='POST'){const b=await body(req);if(!validFavorite(b.payload))return json(res,400,{error:'收藏格式不正确。'});if(db.prepare('SELECT count(*) n FROM favorites WHERE user_id=?').get(u.id).n>=2000)return json(res,400,{error:'收藏已达 2000 条，请先导出并整理。'});db.prepare('INSERT OR IGNORE INTO favorites(user_id,fingerprint,payload) VALUES(?,?,?)').run(u.id,hash(b.payload.sentence.text),JSON.stringify(b.payload));return json(res,200,{ok:true});}
 }
 if(/^\/api\/favorites\/\d+$/.test(p)){const u=required(req),id=Number(p.split('/').pop());if(req.method==='DELETE'){db.prepare('DELETE FROM favorites WHERE id=? AND user_id=?').run(id,u.id);return json(res,200,{ok:true});}if(req.method==='PATCH'){const b=await body(req);if(typeof b.note!=='string'||b.note.length>5000)return json(res,400,{error:'笔记最多 5000 字。'});db.prepare('UPDATE favorites SET note=? WHERE id=? AND user_id=?').run(b.note,id,u.id);return json(res,200,{ok:true});}}
 return json(res,404,{error:'接口不存在。'});
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/demo.json':'demo.json','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js','/icon.svg':'icon.svg'};
 if(!files[p]){res.writeHead(404);return res.end('Not found');}
 const ext=path.extname(files[p]),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
 res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':p==='/sw.js'?'no-cache':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(path.join(root,'public',files[p])));
 }catch(e){json(res,e.status||400,{error:e.name==='TimeoutError'?'生成超时，请稍后重试。':e.message||'操作失败，请重试。'});}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log(`Sentence Lab: http://localhost:${process.env.PORT||3000}`));
