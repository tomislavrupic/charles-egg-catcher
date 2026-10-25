// Keep gameplay independent of browser-wide Math.random overrides from other scripts.
export function createRandom(entropy=globalThis.crypto){
 const word=new Uint32Array(1);
 return ()=>{entropy.getRandomValues(word);return word[0]/4294967296;};
}
export const gameRandom=createRandom();
