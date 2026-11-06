export const title='Little Diesel: explore or learn';
export const state=v=>v.screen;
export const group=v=>v.screen.includes('stroke')||v.screen==='Continuous cycle'?'motion':'view';
export const colors={motion:'orange',view:'teal'};
export const step=(a,f,t)=>({Meet:f.screen==='Peek inside'||f.screen==='Lesson introduction'?'Meet it':null,Peek:f.screen==='Meet it'||f.screen==='Lesson introduction'?'Peek inside':null,Learn:f.screen==='Meet it'||f.screen==='Peek inside'||f.screen==='Continuous cycle'?'Make it go! (starts lesson anew)':null,Part:'Tap a named part',Close:'Got it!',Run:'Let it run',Pause:'Step it',Finish:'Current stroke ends',Limits:'Model limits',Return:'Back to the lesson'})[a];
