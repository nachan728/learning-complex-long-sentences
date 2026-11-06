import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeConfig } from './providers.mjs';

export function credentials(db, directory) {
 const keyFile=path.join(directory,'credential-encryption.key');
 try { writeFileSync(keyFile,randomBytes(32),{flag:'wx',mode:0o600}); } catch(e) { if(e.code!=='EEXIST')throw e; }
 const key=readFileSync(keyFile);if(key.length!==32)throw new Error('密钥加密配置损坏，停止启动。');
 db.exec(`CREATE TABLE IF NOT EXISTS api_credentials(user_id INTEGER PRIMARY KEY REFERENCES users(id), fingerprint TEXT UNIQUE NOT NULL, encrypted TEXT, suffix TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS api_key_owners(fingerprint TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id));`);
 db.exec(`CREATE TABLE IF NOT EXISTS api_settings(user_id INTEGER PRIMARY KEY REFERENCES users(id),provider TEXT NOT NULL,base_url TEXT NOT NULL,model TEXT NOT NULL);`);
 const settings=id=>{const row=db.prepare('SELECT provider,base_url,model FROM api_settings WHERE user_id=?').get(id);return row?{provider:row.provider,baseUrl:row.base_url,model:row.model}:{provider:'deepseek',baseUrl:'https://api.deepseek.com',model:'deepseek-flash'};};
 function decrypt(row){if(!row?.encrypted)return null;const [iv,tag,ciphertext]=row.encrypted.split('.').map(x=>Buffer.from(x,'hex'));const d=createDecipheriv('aes-256-gcm',key,iv);d.setAAD(Buffer.from(String(row.user_id)));d.setAuthTag(tag);return Buffer.concat([d.update(ciphertext),d.final()]).toString();}
 return {
  status(id){const row=db.prepare('SELECT encrypted,suffix FROM api_credentials WHERE user_id=?').get(id);return {configured:Boolean(row?.encrypted),suffix:row?.encrypted?row.suffix:null,...settings(id)};},
  config(id){return normalizeConfig(settings(id));},
  get(id){return decrypt(db.prepare('SELECT * FROM api_credentials WHERE user_id=?').get(id));},
  bind(id,value,input={}){
   const config=normalizeConfig(input);
   if(typeof value!=='string'||! /^[\x21-\x7e]{16,512}$/.test(value.trim()))throw Object.assign(new Error('请输入有效的 API 密钥（16—512 个非空白字符）。'),{status:400});
   const raw=value.trim(),fingerprint=createHash('sha256').update(raw).digest('hex');
   db.exec('BEGIN IMMEDIATE');
   try {
    const owner=db.prepare('SELECT user_id FROM api_key_owners WHERE fingerprint=?').get(fingerprint);
    if(owner&&owner.user_id!==id)throw Object.assign(new Error('此密钥已绑定其他账号，无法使用。'),{status:409});
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(String(id)));
    const encrypted=Buffer.concat([cipher.update(raw,'utf8'),cipher.final()]);
    db.prepare('INSERT OR IGNORE INTO api_key_owners VALUES(?,?)').run(fingerprint,id);
    db.prepare('INSERT INTO api_settings VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider,base_url=excluded.base_url,model=excluded.model').run(id,config.provider,config.baseUrl,config.model);
    db.prepare('INSERT INTO api_credentials VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET fingerprint=excluded.fingerprint,encrypted=excluded.encrypted,suffix=excluded.suffix').run(id,fingerprint,[iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('hex')).join('.'),raw.slice(-4));
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
  remove(id){db.prepare('UPDATE api_credentials SET encrypted=NULL WHERE user_id=?').run(id);}
 };
}
