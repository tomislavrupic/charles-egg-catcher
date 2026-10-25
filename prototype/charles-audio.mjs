export function createGameAudio({makeAudio=src=>new Audio(src),onError=()=>{}}={}){
 const definitions=[
  ['charles-music','music/Charles%20level%201.mp3',.38,true],
  ['charles-audio','assets/charles/animation-2026-10-25/charles-source-audio.wav',.12,true],
  ['charles-win','music/Win.mp3',.65,false],
  ['charles-lose','music/kraj%20fail%202.wav.mp3',.7,false],
  ['charles-life','assets/charles/sounds/blue-egg-life.wav',.65,false],
  ['charles-catch','assets/charles/sounds/egg-catch.wav',.4,false],
  ['charles-drop','assets/charles/sounds/egg-drop.wav',.5,false]
 ];
 const elements=definitions.map(([id,url,volume,loop])=>{
  const a=makeAudio(url);a.id=id;a.volume=volume;a.loop=loop;a.preload='auto';a.playbackRate=1;a.preservesPitch=false;return a;
 });
 const [music,source,win,lose,life,catchSound,dropSound]=elements;let mode='ready',muted=false,cue=null,lifeActive=false;
 const activeSounds=new Set();
 for(const a of [catchSound,dropSound])a.addEventListener('ended',()=>activeSounds.delete(a));
 function effect(a){if(mode!=='playing'||muted)return;activeSounds.add(a);a.currentTime=0;play(a);}
 const play=a=>{const promise=a.play();if(promise?.catch)promise.catch(e=>{if(e?.name!=='AbortError')onError(e);});};
 function sync(){
  elements.forEach(a=>{a.muted=muted;a.pause();});
  music.volume=cue==='win'?.10:.38;
  if(muted)return;
  if(mode==='playing'){play(music);play(source);if(cue==='win')play(win);if(lifeActive)play(life);for(const a of activeSounds)play(a);}
  if(mode==='lost'&&cue==='lose')play(lose);
 }
 life.addEventListener('ended',()=>{lifeActive=false;});
 win.addEventListener('ended',()=>{if(cue==='win'){cue=null;music.volume=.38;}});
 lose.addEventListener('ended',()=>{if(cue==='lose')cue=null;});
 return {
  elements,
  start(){mode='playing';sync();},
  pause(){mode='paused';sync();},
  setMuted(value){muted=value;sync();},
  setRate(value){if(music.playbackRate!==value)music.playbackRate=value;if(source.playbackRate!==value)source.playbackRate=value;},
  eggCatch(){effect(catchSound);},
  eggDrop(){effect(dropSound);},
  life(){if(mode!=='playing'||muted)return;lifeActive=true;life.currentTime=0;play(life);},
  levelComplete(){if(mode!=='playing')return;cue='win';win.currentTime=0;sync();},
  lose(){if(mode==='lost')return;mode='lost';activeSounds.clear();lifeActive=false;cue='lose';win.pause();win.currentTime=0;lose.currentTime=0;sync();},
  reset(){mode='ready';activeSounds.clear();lifeActive=false;cue=null;elements.forEach(a=>{a.pause();a.currentTime=0;});music.volume=.38;music.playbackRate=source.playbackRate=1;}
 };
}
