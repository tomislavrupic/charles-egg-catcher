import {ROUND_GOALS,RULES,createRound,advance,timeScale} from './charles-engine.mjs';
import {SCENES,drawScenery} from './charles-scenery.mjs';
import {gameRandom} from './charles-random.mjs';
import {createGameAudio} from './charles-audio.mjs';
import {endingVisual} from './charles-ending.mjs';
import {gameViewport} from './charles-viewport.mjs';
import {WALK} from './charles-walk.mjs';
if(new URLSearchParams(location.search).has('ipad'))document.documentElement.classList.add('ipad-game');
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d',{alpha:false});
let viewport={width:960,height:540,x:0,y:0};
const ipad=document.documentElement.classList.contains('ipad-game');
if(ipad)new ResizeObserver(entries=>{
 const {width,height}=entries[0].contentRect;if(!width||!height)return;
 viewport=gameViewport(width,height);
 if(canvas.width!==viewport.width)canvas.width=viewport.width;
 if(canvas.height!==viewport.height)canvas.height=viewport.height;
}).observe(canvas);
let lastInk=null;
const elements=new Map();
function ui(selector){if(!elements.has(selector))elements.set(selector,$(selector));return elements.get(selector);}
function text(selector,value){const el=ui(selector);if(el.textContent!==value)el.textContent=value;}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const base='assets/charles/',animation=base+'animation-2026-10-25/',concept=base+'concepts-2026-10-25/';
const gameAudio=createGameAudio({onError:()=>{$('#message').textContent='Tap Sound to enable audio';}});
for(const audio of gameAudio.elements){audio.hidden=true;document.body.append(audio);}
let state=createRound(),ready=false,running=false,started=false,muted=false,atlas,gooberAtlas,spiderAtlas,winAtlas,walkAtlas,endAtlas,ending=null,celebration=null,sprites={},last=0,animTime=0,raf,eventSeen=0,messageUntil=0;
let walking=false,walkDirection=-1,walkTime=0,walkFrame=0;
function resetWalk(){walking=false;walkDirection=-1;walkTime=0;walkFrame=0;}
const keys=new Set();let pointerTarget=null;
if(ipad)document.addEventListener('contextmenu',e=>e.preventDefault());
function image(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not load '+url));im.src=url;});}
// Crop each source-sheet cell to visible pixels while retaining its original art.
function splitSheet(im,count,edges=Array.from({length:count+1},(_,i)=>i/count)){
 return Array.from({length:count},(_,i)=>{
  const c=document.createElement('canvas'),left=Math.floor(edges[i]*im.width);c.width=Math.floor(edges[i+1]*im.width)-left;c.height=im.height;
  const g=c.getContext('2d');g.drawImage(im,-left,0);
  const data=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const sprite=document.createElement('canvas'),w=x1-x0+1,h=y1-y0+1;
  sprite.height=96;sprite.width=Math.max(1,Math.round(96*w/h));
  const sg=sprite.getContext('2d');sg.imageSmoothingEnabled=false;sg.drawImage(c,x0,y0,w,h,0,0,sprite.width,sprite.height);
  return {image:sprite,x:0,y:0,w:sprite.width,h:sprite.height};
 });
}
function sound(){
 gameAudio.setRate(timeScale(state));
 gameAudio.setMuted(muted);
 if(running)gameAudio.start();
 else if(!state.over)gameAudio.pause();
}
function showOverlay(mode){
 $('#overlay').hidden=false;
 const lost=mode==='over',paused=mode==='pause';
 $('#eyebrow').textContent=lost?'ROUND COMPLETE':paused?'TAKE A BREATHER':'HELLO, CHARLES!';
 $('#headline').innerHTML=lost?`${state.eggs} ${state.eggs===1?'egg':'eggs'} saved!`:paused?'Basket break.':'A basket.<br>A big adventure.';
 $('#description').innerHTML=lost?`You reached level ${state.level}.<br>Ready for another basketful?`:paused?'Your eggs can wait.':'Catch 10 fresh → 20 cracked → 30 of all eggs.<br>Charles can catch with his whole body!';
 $('#start').textContent=paused?'Keep catching →':lost?'Play again →':'Let’s catch eggs →';
 $('#load-status').textContent=lost?'EVERY ROUND IS A NEW ADVENTURE':'Arrows or drag to move · Space to pause';
}
function start(){if(!ready||ending)return;if(state.over){state=createRound();ending=null;celebration=null;resetWalk();animTime=0;eventSeen=0;gameAudio.reset();pointerTarget=null;}started=true;running=true;$('#overlay').hidden=true;$('#pause').disabled=false;$('#pause').textContent='Pause';$('#restart').disabled=false;last=0;sound();canvas.focus({preventScroll:true});}
function pause(){if(!started||state.over)return;running=!running;keys.clear();$('#pause').textContent=running?'Pause':'Resume';if(running){$('#overlay').hidden=true;last=0;}else showOverlay('pause');sound();}
function restart(){state=createRound();ending=null;celebration=null;resetWalk();animTime=0;eventSeen=0;gameAudio.reset();pointerTarget=null;keys.clear();$('#message').textContent='';start();}
$('#start').onclick=start;$('#pause').onclick=pause;$('#restart').onclick=restart;
$('#sound').onclick=()=>{muted=!muted;$('#sound').textContent=muted?'Sound off':'Sound on';$('#sound').setAttribute('aria-pressed',String(muted));sound();};
function pointer(e){const r=canvas.getBoundingClientRect();pointerTarget=(e.clientX-r.left)/r.width*viewport.width-viewport.x;}
canvas.onpointerdown=e=>{if(!running)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointer(e);};
canvas.onpointermove=e=>{if(running&&canvas.hasPointerCapture(e.pointerId))pointer(e);};
for(const [id,key] of [['left','ArrowLeft'],['right','ArrowRight']]){
 const b=$('#'+id);b.onpointerdown=e=>{e.preventDefault();pointerTarget=null;b.setPointerCapture(e.pointerId);keys.add(key);};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(key);
}
document.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();pointerTarget=null;keys.add(e.code);}
 if(e.code==='Space'&&!ending&&!e.repeat&&!e.target.matches('button,a')){e.preventDefault();if(!started||state.over)start();else pause();}
 if(e.key==='Escape'&&running)pause();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(running)pause();else gameAudio.pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(running)pause();else gameAudio.pause();}});
function drawLifeEgg(x,y,size){
 // A tiny pixel sprite with a stepped cyan aura, animated with the game clock.
 const pixels=['.....OO.....','....OBBO....','...OBHHBO...','..OBHHBBBO..','..OBHBBBBO..','.OBBBBBBBBO.','.OBBBCCBBBO.','.OBBCCCCCBO.','.OBBBCCBBBO.','..OBBBBBBO..','...OOOOOO...'];
 const step=size/11;ctx.save();ctx.translate(Math.round(x-6*step),Math.round(y-size/2));
 const pulse=.25+.15*Math.sin(animTime*4);
 ctx.fillStyle=`rgba(77,202,255,${pulse})`;
 ctx.fillRect(-step,step,14*step,10*step);ctx.fillRect(step,-step,10*step,14*step);
 const palette={O:'#143b8a',B:'#328fff',H:'#bcf4ff',C:'#e6ffff'};
 pixels.forEach((row,py)=>[...row].forEach((pixel,px)=>{if(palette[pixel]){ctx.fillStyle=palette[pixel];ctx.fillRect(px*step,py*step,step,step);}}));
 ctx.fillStyle='#e6ffff';const sparkle=Math.floor(animTime*3)%2;ctx.fillRect(-2*step,(sparkle?2:7)*step,step,step);ctx.fillRect(13*step,(sparkle?8:1)*step,step,step);ctx.restore();
}
function drawItem(kind,x,y,size){if(kind==='life'){drawLifeEgg(x,y,size);return;}const s=sprites[kind];if(s)ctx.drawImage(s.image,s.x,s.y,s.w,s.h,Math.round(x-size*s.w/s.h/2),Math.round(y-size/2),size*s.w/s.h,size);}
function render(){
 ctx.imageSmoothingEnabled=false;
 const scene=drawScenery(ctx,state.level,animTime,viewport.width,viewport.height);
 ctx.save();ctx.translate(viewport.x,viewport.y);
 if(lastInk!==scene.ink){ui('#message').style.color=scene.ink;lastInk=scene.ink;}
 for(const enemy of state.ground){
  if(enemy.kind==='goober'&&gooberAtlas){
   const f=Math.floor(animTime*24)%33;
   ctx.drawImage(gooberAtlas,(f%7)*192+14,Math.floor(f/7)*192+32,166,116,Math.round(enemy.x-34),454,68,47);
   continue;
  }
  if(enemy.kind==='crusher'&&spiderAtlas){
   const f=Math.floor(animTime*24)%20;
   ctx.drawImage(spiderAtlas,(f%5)*192+6,Math.floor(f/5)*192+22,180,144,Math.round(enemy.x-32),449,64,52);
   if(enemy.crunch>0){
    const spread=(.4-enemy.crunch)*50;
    ctx.fillStyle='#fff4d1';ctx.fillRect(enemy.x-8-spread,451-spread,5,4);ctx.fillRect(enemy.x+6+spread,449-spread,4,5);
    ctx.fillStyle='#edbc51';ctx.fillRect(enemy.x-2,451-spread*.4,5,3);
   }
   continue;
  }
  const height=enemy.kind==='goober'?27:48;
  drawItem(enemy.kind,enemy.x,501-height/2,height);
 }
 if(walking&&walkAtlas){
  ctx.save();ctx.translate(Math.round(state.x),WALK.anchors[walkFrame].drawY);ctx.scale(walkDirection>0?-1:1,1);
  ctx.drawImage(walkAtlas,(walkFrame%WALK.columns)*192,Math.floor(walkFrame/WALK.columns)*192,192,192,-120,0,240,240);ctx.restore();
 }else if(atlas){ctx.drawImage(atlas,0,0,192,192,Math.round(state.x-120),276,240,240);}
 for(const item of state.items)drawItem(item.kind==='rock'&&Math.floor(item.x)%2?'rock2':item.kind,item.x,item.y,item.kind==='rock'?37:item.kind==='bonus'?40:31);
 // Visible basket contents, without displaying a numeric score during play.
 for(let i=0;i<Math.min(state.eggs,5);i++)drawItem('fresh',(state.basketX??state.x)-26+i*13,(state.basketY??RULES.catchY)-5-(i%2)*5,15);
 ctx.restore();
 if(celebration&&winAtlas){
  ctx.save();ctx.translate(viewport.x,viewport.y/2);
  ctx.fillStyle='#fff7e8';ctx.fillRect(-viewport.x,-viewport.y/2,viewport.width,viewport.height);
  const f=Math.min(48,Math.floor(celebration.elapsed*24));
  ctx.drawImage(winAtlas,(f%7)*192,Math.floor(f/7)*192,192,192,288,95,384,384);
  ctx.textAlign='center';ctx.fillStyle='#344828';ctx.font='bold 25px monospace';
  ctx.fillText(`LEVEL ${celebration.completedLevel} COMPLETE!`,480,65);
  ctx.font='15px monospace';ctx.fillText(`Next: ${SCENES[state.level-1].name}`,480,515);
  ctx.textAlign='start';ctx.restore();
 }
 if(ending&&endAtlas){
  const visual=endingVisual(ending.elapsed,reducedMotion.matches);
  ctx.fillStyle=`rgb(${visual.red},5,14)`;ctx.fillRect(0,0,viewport.width,viewport.height);
  const f=visual.frame,size=visual.size;
  ctx.drawImage(endAtlas,(f%7)*192,Math.floor(f/7)*192,192,192,(viewport.width-size)/2,(viewport.height-size)/2,size,size);
 }
 text('#lives',Array.from({length:3},(_,i)=>i<3-state.mistakes?'♥':'♡').join(' '));
 const livesLabel=`${Math.max(0,3-state.mistakes)} chances remaining`;
 if(ui('#lives').getAttribute('aria-label')!==livesLabel)ui('#lives').setAttribute('aria-label',livesLabel);
 text('#level',`LEVEL ${state.level}${state.level===4?' · ENDLESS':''}`);
 text('#time',state.level<4?`${['Fresh eggs','Cracked eggs','All egg types'][state.level-1]} · ${state.roundCaught} / ${ROUND_GOALS[state.level-1]}`:scene.name);
 text('#spoiled-rule',state.level===3?'CATCH GREEN EGGS TOO':'AVOID SPOILED EGGS');
 if(ui('#slow').hidden!==(state.slowRemaining<=0))ui('#slow').hidden=state.slowRemaining<=0;
 text('#slow',`GOOBER · SLOW MOTION ${Math.ceil(state.slowRemaining)}s`);
}
function tick(now){
 const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
 if(ending){
  if(!document.hidden)ending.elapsed+=dt;
  if(endingVisual(ending.elapsed).done){ending=null;showOverlay('over');}
 }else if(running){
  if(celebration){
   celebration.elapsed+=dt;
   if(celebration.elapsed>=49/24){celebration=null;$('#message').textContent='';}
  }else{
  const direction=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
  const previousLevel=state.level,previousLifeGains=state.lifeGains,previousCatches=state.eggCatches,previousDrops=state.eggDrops;
  const intent=direction||(pointerTarget!=null&&Math.abs(pointerTarget-state.x)>.5?Math.sign(pointerTarget-state.x):0);
  walking=intent<0?state.x>100:intent>0?state.x<860:false;
  if(walking){walkDirection=intent;walkTime+=dt*timeScale(state);}else walkTime=0;
  walkFrame=Math.floor(walkTime*WALK.fps)%WALK.frameCount;
  const anchor=walking?WALK.anchors[walkFrame]:null;
  animTime+=dt*timeScale(state);advance(state,dt,gameRandom,{direction,targetX:pointerTarget,
   basketOffset:anchor?(walkDirection>0?-anchor.offset:anchor.offset):0,basketY:anchor?.y??RULES.catchY,
   spawnY:-35-viewport.y,minX:100,maxX:860});
  if(state.eggCatches>previousCatches)gameAudio.eggCatch();
  if(state.eggDrops>previousDrops)gameAudio.eggDrop();
  if(state.lifeGains>previousLifeGains&&!state.over)gameAudio.life();
  gameAudio.setRate(timeScale(state));
  if(state.level!==previousLevel&&!state.over){
   celebration={elapsed:0,completedLevel:previousLevel};gameAudio.levelComplete();
  }
  if(state.eventId!==eventSeen){eventSeen=state.eventId;$('#message').textContent=({fresh:'Nice catch!',cracked:'Cracked egg caught!',spoiled:state.level===3?'Green egg caught!':'Spoiled egg! Watch out.',rock:'Crack! One egg broken.',crusher:'Crunch! The spiky one crushed an egg.',spiderCatch:'Crack! The spider caught an egg.',goober:'Goober! Everything slows down.',miss:'An egg got away!',level:`LEVEL ${state.level} · ${SCENES[state.level-1].name}`,bonus:'A special egg!',life:'Blue egg! +1 life (up to 3).'}[state.event]||'');messageUntil=now+1800;}
  if(now>messageUntil)text('#message','');
  if(state.over){running=false;keys.clear();gameAudio.lose();$('#pause').disabled=true;ending={elapsed:0};$('#overlay').hidden=true;$('#message').textContent='';}
  }
 }
 render();raf=requestAnimationFrame(tick);
}
try{
 const loaded=await Promise.all([image(animation+'charles-atlas.png'),image(concept+'fresh-and-spoiled-eggs.png'),image(concept+'rocks-and-score-egg-v2.png'),image(concept+'goober-and-crusher.png'),image(base+'goober-loop-2026-10-25/goober-atlas.png'),image(base+'spider-loop-2026-10-25/spider-atlas.png'),image(base+'win-animation-2026-10-25/win-atlas.png'),image(base+'walk-animation-2026-10-25/walk-atlas.png'),image(concept+'cracked-egg.png'),image(base+'end-animation-2026-10-25/end-atlas.png')]);
 gooberAtlas=loaded[4];
 spiderAtlas=loaded[5];
 winAtlas=loaded[6];
 walkAtlas=loaded[7];
 endAtlas=loaded[9];
 atlas=loaded[0];const eggs=splitSheet(loaded[1],2),rocks=splitSheet(loaded[2],3);
 const enemies=splitSheet(loaded[3],2,[0,.42,1]);
 sprites={cracked:splitSheet(loaded[8],1)[0],fresh:eggs[0],spoiled:eggs[1],rock:rocks[0],rock2:rocks[1],bonus:rocks[2],goober:enemies[0],crusher:enemies[1]};
 ready=true;$('#start').disabled=false;showOverlay('ready');
}catch(error){$('#headline').textContent='Charles needs his drawings.';$('#description').textContent=error.message;$('#load-status').textContent='Open through the PXL local server, then reload.';}
render();raf=requestAnimationFrame(tick);
