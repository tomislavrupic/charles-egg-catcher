export const END_DURATION=49/24;
export function endingVisual(elapsed,reducedMotion=false){
 const t=Math.max(0,elapsed),pulse=Math.max(0,1-Math.abs(t-.35)/.22,1-Math.abs(t-1.2)/.22);
 return {frame:Math.min(48,Math.floor(t*24)),done:t>=END_DURATION,
  red:reducedMotion?90:Math.round(48+120*pulse),
  size:reducedMotion?480:Math.round(380+180*Math.min(1,t/.22))};
}
