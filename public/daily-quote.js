(() => {
 // 原创双语短句，不依赖网络、模型或 UTC 日期。
 const quotes=[
 ['Every small step brings your goal closer.','每迈出一小步，目标就更近一点。'],
 ['Keep learning, even when progress feels slow.','即使进步缓慢，也别停止学习。'],
 ['What you practice today becomes your strength tomorrow.','今天的练习，会成为明天的底气。'],
 ['You do not need to be perfect to make progress.','不必做到完美，也能不断进步。'],
 ['A difficult sentence is another chance to grow.','每一个难句，都是一次成长的机会。'],
 ['Give your effort time to become progress.','给努力一点时间，让进步慢慢显现。'],
 ['Begin with what you can do, and build from there.','从力所能及的事开始，一点点积累。'],
 ['Your pace may change; your purpose can stay.','步调可以调整，心中的目标不必动摇。'],
 ['One focused moment can move you forward.','每一次专注，都能让你向前一点。'],
 ['Be patient with yourself, and keep showing up.','对自己多一点耐心，也多一份坚持。'],
 ['The work you do quietly still matters.','那些默默付出的努力，同样有意义。'],
 ['Turn today’s uncertainty into one clear action.','把今天的迷茫，化为一个明确的行动。'],
 ['Rest when you need to, then take the next step.','需要时就休息，然后继续迈出下一步。'],
 ['Let curiosity carry you through the difficult parts.','让好奇心陪你走过难懂的地方。'],
 ['Your next attempt may teach you something new.','再试一次，也许就会有新的领悟。'],
 ['Build the habit, and let the results follow.','先养成习惯，再让成果慢慢到来。'],
 ['You can start again without starting from nothing.','重新开始，并不意味着从零开始。'],
 ['Understanding grows each time you return to a challenge.','每次重新面对难题，理解都会更深一点。'],
 ['Choose steady effort over a perfect beginning.','与其等待完美开局，不如踏实地行动。'],
 ['Make room today for the future you are building.','为正在创造的未来，留出今天的努力。'],
 ['The next page may be easier than you expect.','下一页，也许没有想象中那么难。'],
 ['Learn one thing well, then reach for the next.','认真学懂一点，再向下一点出发。'],
 ['Small gains deserve your recognition too.','微小的进步，也值得被自己看见。'],
 ['Keep your goal in sight and your next step simple.','心中有目标，脚下的一步就踏实些。'],
 ['You are building more than a score; you are building confidence.','你积累的不只是分数，还有面对挑战的信心。'],
 ['A fresh day is a fresh chance to try.','新的一天，又是一次尝试的机会。'],
 ['Let yesterday teach you, not hold you back.','让昨天成为经验，而不是牵绊。'],
 ['Stay with the process, and notice how far you have come.','坚持走下去，也别忘了看看自己已经走了多远。'],
 ['The courage to continue can begin with one sentence.','继续前行的勇气，可以从读懂一句话开始。'],
 ['Do what you can today; tomorrow can build on it.','今天尽力做好一点，明天就能在此基础上继续。'],
 ['There is strength in returning to your goal each day.','每天重新朝目标出发，本身就是一种力量。']
 ];
 const area=document.querySelector('#dailyQuote');if(!area)return;
 let timer;
 function update(){
  const now=new Date();
  // 用本地年月日组成日历序号，避免 UTC 提前换日或夏令时造成日期偏移。
  const day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
  const [english,chinese]=quotes[((day%quotes.length)+quotes.length)%quotes.length];
  area.querySelector('.quote-en').textContent=english;area.querySelector('.quote-zh').textContent=chinese;
  clearTimeout(timer);const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  timer=setTimeout(update,Math.min(midnight-now+50,60000));
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});window.addEventListener('focus',update);update();
})();
