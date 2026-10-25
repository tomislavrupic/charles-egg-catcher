import {rankScores,cleanName} from './charles-scores.mjs';
export const SCORE_API='https://charles-scores.tom-d-vox.workers.dev/scores';
export function createScoreClient(fetcher=globalThis.fetch){
 async function request(options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetcher(SCORE_API,{...options,signal:controller.signal});
   const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not save your score.');
   if(!Array.isArray(body.scores))throw new Error('Scores are temporarily unavailable.');
   return rankScores(body.scores);
  }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw new Error('You are offline or scores are unavailable. Try again.');throw error;}
  finally{clearTimeout(timeout);}
 }
 return {list:()=>request(),save:(name,score,runId)=>request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cleanName(name),score,runId})})};
}
export function scoreRunId(entropy=globalThis.crypto){return [...entropy.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');}
