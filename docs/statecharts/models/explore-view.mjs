export const title='Little Diesel: focused exploration and learning';
export const state=v=>v.screen;
export const group=v=>v.screen.includes('stroke')||v.screen==='Continuous cycle'?'motion':'view';
export const colors={motion:'orange',view:'teal'};
export const step=a=>({Meet:'Meet it',Peek:'Peek inside',Learn:'Make it go!',Part:'Tap a named part',Close:'Got it!',More:'More',ReturnMenu:'Close or Escape',Explore:'Explore engine / Back exit',Run:'Let it run',Pause:'Step it',Finish:'Current stroke ends',Limits:'What this model leaves out',Return:'Back to the lesson'})[a];
