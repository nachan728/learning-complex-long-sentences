const {app,BrowserWindow,dialog}=require('electron');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
let backend,window;
app.setName('句间');
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(async()=>{
  const directory=path.join(app.getPath('userData'),'study-data');fs.mkdirSync(directory,{recursive:true});
  const resource=app.isPackaged?path.join(process.resourcesPath,'backend'):path.resolve(__dirname,'..');
  const runtime=app.isPackaged?path.join(process.resourcesPath,'runtime','node.exe'):process.env.SENTENCE_NODE_PATH||'node.exe';
  backend=spawn(runtime,[path.join(resource,'desktop','backend.mjs')],{windowsHide:true,cwd:resource,env:{...process.env,DATABASE_PATH:path.join(directory,'study.sqlite'),HOST:'127.0.0.1',PORT:'0',APP_ORIGIN:'',COOKIE_SECURE:'false'},stdio:['ignore','ignore','pipe','ipc']});
  let started=false;
  const timeout=setTimeout(()=>{if(!started){dialog.showErrorBox('句间启动失败','后台启动超时，请关闭软件后重试。');app.quit();}},20000);
  backend.on('error',()=>{clearTimeout(timeout);dialog.showErrorBox('句间启动失败','无法启动内置运行环境，请重新安装。');app.quit();});
  backend.on('exit',()=>{if(!app.isQuitting){dialog.showErrorBox('句间后台已停止','请重新打开软件。学习数据仍保存在本机。');app.quit();}});
  backend.on('message',async message=>{
   if(message.type!=='ready'||started)return;started=true;clearTimeout(timeout);
   const url=`http://127.0.0.1:${message.port}`;
   window=new BrowserWindow({width:1250,height:900,minWidth:720,minHeight:600,title:'句间 · 考研英语阅读练习',autoHideMenuBar:true,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:sentence-lab'}});
   window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   window.webContents.on('will-navigate',(event,target)=>{if(new URL(target).origin!==url)event.preventDefault();});
   window.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
   window.once('ready-to-show',()=>window.show());
   await window.loadURL(url);
   if(process.argv.includes('--smoke-test')){const state=await window.webContents.executeJavaScript("({title:document.title,ready:!!document.querySelector('#generate'),width:innerWidth})");fs.writeFileSync(path.join(app.getPath('userData'),'smoke-test.json'),JSON.stringify(state));app.quit();}
  });
 });
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',()=>{app.isQuitting=true;if(backend){backend.kill();backend=null;}});
}
