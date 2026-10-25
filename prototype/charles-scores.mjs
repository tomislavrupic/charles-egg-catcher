export const SCORE_LIMIT=10;
export function cleanName(value){return String(value??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g,'').replace(/\s+/g,' ').trim().slice(0,16);}
export function validScore(value){return Number.isSafeInteger(value)&&value>=0&&value<=1000000;}
export function rankScores(entries){
 return (Array.isArray(entries)?entries:[]).filter(e=>e&&validScore(e.score)&&cleanName(e.name)&&Number.isFinite(e.at))
  .map(e=>({name:cleanName(e.name),score:e.score,at:e.at}))
  .sort((a,b)=>b.score-a.score||a.at-b.at).slice(0,SCORE_LIMIT);
}
export function addScore(entries,name,score,at=Date.now()){
 const player=cleanName(name);if(!player||!validScore(score)||!Number.isFinite(at))throw new Error('Enter a name to save your score.');
 return rankScores([...rankScores(entries),{name:player,score,at}]);
}
export function readScores(storage){try{return rankScores(JSON.parse(storage.getItem('charles.highScores.v1')??'[]'));}catch{return [];}}
export function writeScores(storage,entries){storage.setItem('charles.highScores.v1',JSON.stringify(rankScores(entries)));}
