// Expand the visible sky, never stretch the game's pixels.
export function gameViewport(width,height){
 const ratio=width/Math.max(1,height);
 const w=Math.max(960,Math.round(540*ratio)),h=Math.max(540,Math.round(960/ratio));
 return {width:w,height:h,x:(w-960)/2,y:h-540};
}
