import {gameRandom} from './charles-random.mjs';
export const RULES=Object.freeze({width:960,height:540,catchY:316,basketHalf:42,spiderCatchY:454,spiderHalf:34,bodyHalf:60,bodyTop:320,bodyBottom:501,maxMistakes:3});
export const ROUND_GOALS=Object.freeze([10,20,30,Infinity]);
export function isCollectible(kind,level){return kind==='life'||kind==='fresh'||kind==='cracked'||kind==='bonus'||(kind==='spoiled'&&level===3);}
function isTarget(kind,level){return level===1?kind==='fresh':level===2?kind==='cracked':level===3&&kind!=='life'&&isCollectible(kind,level);}
export function createRound(){return {x:480,elapsed:0,levelElapsed:0,roundCaught:0,lifeGains:0,eggCatches:0,eggDrops:0,level:1,eggs:0,mistakes:0,over:false,items:[],ground:[],enemyIn:0,slowRemaining:0,spawnIn:.6,event:null,eventId:0};}
export function timeScale(s){return s.slowRemaining>0?.45:1;}
export function movePlayer(s,x,min=65,max=895){if(!s.over){const previous=s.x;s.x=Math.max(min,Math.min(max,x));if(s.basketX!=null)s.basketX+=s.x-previous;}}
export function chooseKind(level,r){
 if(r>=.96)return 'life';
 r/=.96;
 if(level===1)return r<.76?'fresh':'spoiled';
 if(level===2)return r<.55?'cracked':r<.70?'fresh':r<.84?'spoiled':'rock';
 if(level===3)return r<.37?'fresh':r<.72?'cracked':r<.85?'spoiled':'rock';
 return r<.28?'fresh':r<.48?'cracked':r<.70?'spoiled':r<.97?'rock':'bonus';
}
export function difficulty(level,elapsed){
 const speed=[125,175,225,330][level-1],interval=[.9,.72,.58,.38][level-1];
 const extra=level===4?Math.max(0,elapsed):0;
 return {speed:speed+Math.min(150,extra*.7),interval:Math.max(.24,interval-extra*.0008)};
}
function report(s,kind){s.event=kind;s.eventId++;}
export function catchItem(s,kind){
 if(s.over)return;
 if(kind==='life'){if(s.mistakes>0){s.mistakes--;s.lifeGains++;}}
 else if(isCollectible(kind,s.level)){s.eggs+=kind==='bonus'?5:1;s.eggCatches++;}
 if(isTarget(kind,s.level))s.roundCaught++;
 if(kind==='rock')s.eggs=Math.max(0,s.eggs-1);
 else if(kind==='spoiled'&&s.level!==3)s.mistakes++;
 report(s,kind);s.over=s.mistakes>=RULES.maxMistakes;
}
export function advance(s,dt,random=gameRandom,input={}){
 if(s.over)return;
 dt=Math.max(0,Math.min(.05,dt));const worldDt=dt*timeScale(s),previousX=s.x;
 const previousBasketX=s.basketX??previousX,previousBasketY=s.basketY??RULES.catchY;
 s.slowRemaining=Math.max(0,s.slowRemaining-dt);if(s.slowRemaining<.000001)s.slowRemaining=0;
 const direction=input.direction||0,limit=470*worldDt;
 const distance=direction?direction*limit:input.targetX!=null?Math.max(-limit,Math.min(limit,input.targetX-s.x)):0;
 movePlayer(s,s.x+distance,input.minX??65,input.maxX??895);s.elapsed+=worldDt;s.levelElapsed+=worldDt;
 s.basketX=s.x+(input.basketOffset??0);s.basketY=input.basketY??RULES.catchY;
 s.enemyIn-=worldDt;
 if(s.level>=2&&s.enemyIn<=0&&s.ground.length<3){
  const fromLeft=random()<.5,kind=s.level>=3&&random()<.6?'crusher':'goober';
  s.ground.push({kind,x:fromLeft?-40:1000,vx:(fromLeft?1:-1)*(kind==='goober'?42:90),ttl:27,touching:false});
  s.enemyIn=s.level===4?5:7;
 }
 s.ground=s.ground.filter(enemy=>{
  const oldX=enemy.x;enemy.previousX=oldX;enemy.x+=enemy.vx*worldDt;enemy.ttl-=worldDt;
  enemy.crunch=Math.max(0,(enemy.crunch||0)-worldDt);
  const before=previousX-oldX,after=s.x-enemy.x;
  const crossed=Math.min(before,after)<=34&&Math.max(before,after)>=-34;
  if(crossed&&!enemy.touching){
   if(enemy.kind==='goober'){s.slowRemaining=4;report(s,'goober');return false;}
   s.eggs=Math.max(0,s.eggs-1);report(s,'crusher');
  }
  enemy.touching=Math.abs(after)<=34;
  return enemy.ttl>0&&enemy.x>-100&&enemy.x<1060;
 });
 s.spawnIn-=worldDt;
 if(s.spawnIn<=0){
  const pace=difficulty(s.level,s.levelElapsed);
  s.items.push({kind:chooseKind(s.level,random()),x:65+random()*830,y:input.spawnY??-35,vy:pace.speed+random()*35});
  s.spawnIn=pace.interval;
 }
 s.items=s.items.filter(item=>{
  if(s.over||s.roundCaught>=ROUND_GOALS[s.level-1])return true;
  const previous=item.y;item.y+=item.vy*worldDt;
  if(previous<=previousBasketY&&item.y>=s.basketY){
   const relativeMotion=(item.y-previous)-(s.basketY-previousBasketY);
   const t=relativeMotion?(previousBasketY-previous)/relativeMotion:1;
   const basketX=previousBasketX+(s.basketX-previousBasketX)*t;
   if(Math.abs(item.x-basketX)<=RULES.basketHalf){catchItem(s,item.kind);return false;}
  }
  // Sweep the egg relative to Charles, including movement between frames.
  if(isCollectible(item.kind,s.level)&&bodyTouches(item.x-previousX,previous,item.x-s.x,item.y)){
   catchItem(s,item.kind);return false;
  }
  if(item.kind!=='rock'&&previous<=RULES.spiderCatchY&&item.y>=RULES.spiderCatchY){
   const t=(RULES.spiderCatchY-previous)/(item.y-previous);
   const spider=s.ground.find(e=>e.kind==='crusher'&&Math.abs(item.x-((e.previousX??e.x)+(e.x-(e.previousX??e.x))*t))<=RULES.spiderHalf);
   if(spider){
    spider.crunch=.4;
    if(isCollectible(item.kind,s.level)&&item.kind!=='bonus'&&item.kind!=='life')s.mistakes++;
    report(s,'spiderCatch');s.over=s.mistakes>=RULES.maxMistakes;return false;
   }
  }
  if(item.y>RULES.height){if(item.kind!=='rock')s.eggDrops++;if(isCollectible(item.kind,s.level)&&!['bonus','life','spoiled'].includes(item.kind)){s.mistakes++;report(s,'miss');s.over=s.mistakes>=RULES.maxMistakes;}return false;}
  return true;
 });
 if(!s.over&&s.roundCaught>=ROUND_GOALS[s.level-1]){
  s.level++;s.roundCaught=0;s.levelElapsed=0;s.items=[];s.ground=[];s.enemyIn=0;s.spawnIn=.8;s.slowRemaining=0;report(s,'level');
 }
}
// Segment against an expanded body rectangle (egg radius included).
function bodyTouches(x0,y0,x1,y1){
 let enter=0,exit=1;
 for(const [start,end,min,max] of [[x0,x1,-RULES.bodyHalf-12,RULES.bodyHalf+12],[y0,y1,RULES.bodyTop-15,RULES.bodyBottom+15]]){
  const d=end-start;if(d===0){if(start<min||start>max)return false;continue;}
  const a=(min-start)/d,b=(max-start)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(enter>exit)return false;
 }
 return true;
}
