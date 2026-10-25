export const SCENES=[
 {name:'Sunny meadow',sky:['#9ed9ee','#b4e4ee','#d4edf0','#e2f1dc'],cloud:'#fff9e6',grass:'#6a9a48',tips:'#88b85d',flecks:'#a8ce72',sun:'#ffe075',ink:'#3d6d7f'},
 {name:'Adriatic sunset',sky:['#837ab0','#ba88ac','#eda294','#ffd395'],cloud:'#dfb2c0',grass:'#656d48',tips:'#87965a',flecks:'#acb373',sun:'#ffe6a5',ink:'#73414e'},
 {name:'Moonlit night',sky:['#111a38','#192443','#223356','#314965'],cloud:'#34415c',grass:'#263c42',tips:'#3b5b58',flecks:'#608078',sun:'#e9edd4',ink:'#d4dfed'},
 {name:'Red sky · survive',sky:['#4b1725','#7d2432','#b5383b','#dc5b45'],cloud:'#51232e',grass:'#342c2d',tips:'#5e3d37',flecks:'#a26b4b',sun:'#f68b53',ink:'#ffe1b4'}
];
function disc(ctx,x,y,r,color){ctx.fillStyle=color;for(let py=-r;py<r;py+=6)for(let px=-r;px<r;px+=6)if((px+3)**2+(py+3)**2<=r*r)ctx.fillRect(x+px,y+py,6,6);}
function cloud(ctx,x,y,color){ctx.fillStyle=color;ctx.fillRect(x,y+12,108,12);ctx.fillRect(x+18,y,42,24);ctx.fillRect(x+60,y+6,30,18);}
let cached=null;
export function drawScenery(ctx,level,time,width=960,height=540){
 const s=SCENES[level-1],extra=height-540,xOffset=(width-960)/2;
 const key=`${level}:${width}:${height}`;
 if(cached?.key!==key){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const g=canvas.getContext('2d'),skyHeight=height-39;
  s.sky.forEach((color,i)=>{g.fillStyle=color;const y=Math.floor(i*skyHeight/4);g.fillRect(0,y,width,Math.ceil(skyHeight/4)+1);});
  if(level===3){disc(g,785+xOffset,88+extra*.25,32,s.sun);disc(g,799+xOffset,76+extra*.25,29,s.sky[0]);}
  else disc(g,(level===2?780:790)+xOffset,(level===2?392:level===4?145:85)+extra*(level===2?1:.25),level===2?48:34,s.sun);
  g.fillStyle=s.grass;g.fillRect(0,height-39,width,39);g.fillStyle=s.tips;
  for(let i=0;i<Math.ceil(width/13);i++)g.fillRect(i*13,height-47+(i%3)*3,7,15);
  g.fillStyle=s.flecks;for(let i=0;i<Math.ceil(width/27);i++)g.fillRect((i*79)%width,height-24+(i%3)*6,5,3);
  cached={key,canvas};
 }
 ctx.drawImage(cached.canvas,0,0);
 if(level===3){
  for(let i=0;i<31;i++){
   const x=30+(i*173)%(width-60),y=24+(i*67)%(300+extra*.5),glow=Math.sin(time*.9+i*2.7);
   ctx.fillStyle=glow>.6?'#fff4c6':glow>-.5?'#a8b9ce':'#637994';
   ctx.fillRect(x,y,3,3);if(i%7===0&&glow>.6){ctx.fillRect(x-3,y+1,9,1);ctx.fillRect(x+1,y-3,1,9);}
  }
 }
 const drift=time*(level===4?6:2),range=width+230;
 cloud(ctx,((120+drift)%range)-115,95+extra*.3,s.cloud);
 cloud(ctx,((480+drift*.65)%range)-115,160+extra*.3,s.cloud);
 cloud(ctx,((930+drift*.8)%range)-115,65+extra*.3,s.cloud);
 return s;
}
