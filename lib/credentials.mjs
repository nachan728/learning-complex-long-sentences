import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function credentials(db, directory) {
 const keyFile=path.join(directory,'credential-encryption.key');
 try { writeFileSync(keyFile,randomBytes(32),{flag:'wx',mode:0o600}); } catch(e) { if(e.code!=='EEXIST')throw e; }
 const key=readFileSync(keyFile);if(key.length!==32)throw new Error('密钥加密配置损坏，停止启动。');
 db.exec(`CREATE TABLE IF NOT EXISTS api_credentials(user_id INTEGER PRIMARY KEY REFERENCES users(id), fingerprint TEXT UNIQUE NOT NULL, encrypted TEXT, suffix TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS api_key_owners(fingerprint TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id));`);
 function decrypt(row){if(!row?.encrypted)return null;const [iv,tag,ciphertext]=row.encrypted.split('.').map(x=>Buffer.from(x,'hex'));const d=createDecipheriv('aes-256-gcm',key,iv);d.setAAD(Buffer.from(String(row.user_id)));d.setAuthTag(tag);return Buffer.concat([d.update(ciphertext),d.final()]).toString();}
 return {
  status(id){const row=db.prepare('SELECT encrypted,suffix FROM api_credentials WHERE user_id=?').get(id);return {configured:Boolean(row?.encrypted),suffix:row?.encrypted?row.suffix:null};},
  get(id){return decrypt(db.prepare('SELECT * FROM api_credentials WHERE user_id=?').get(id));},
  bind(id,value){
   if(typeof value!=='string'||!/^sk-[a-zA-Z0-9_-]{16,200}$/.test(value.trim()))throw Object.assign(new Error('请输入有效的 DeepSeek API 密钥。'),{status:400});
   const raw=value.trim(),fingerprint=createHash('sha256').update(raw).digest('hex');
   db.exec('BEGIN IMMEDIATE');
   try {
    const owner=db.prepare('SELECT user_id FROM api_key_owners WHERE fingerprint=?').get(fingerprint);
    if(owner&&owner.user_id!==id)throw Object.assign(new Error('此密钥已绑定其他账号，无法使用。'),{status:409});
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(String(id)));
    const encrypted=Buffer.concat([cipher.update(raw,'utf8'),cipher.final()]);
    db.prepare('INSERT OR IGNORE INTO api_key_owners VALUES(?,?)').run(fingerprint,id);
    db.prepare('INSERT INTO api_credentials VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET fingerprint=excluded.fingerprint,encrypted=excluded.encrypted,suffix=excluded.suffix').run(id,fingerprint,[iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('hex')).join('.'),raw.slice(-4));
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
  remove(id){db.prepare('UPDATE api_credentials SET encrypted=NULL WHERE user_id=?').run(id);}
 };
}
