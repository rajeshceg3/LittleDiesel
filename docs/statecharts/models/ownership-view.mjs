export const title='Playback note ownership after the fix';
export const state=v=>v.playback==='Stepped'?'Stepped: no autoplay note':({'Absent':'Continuous: no note','Pending':'Continuous: note scheduled','Visible':'Continuous: note visible'})[v.note];
export const step=a=>({Power:'First power stroke schedules note',Callback:'2.6 seconds: owner still valid',Step:'Step it: cancel and invalidate',Resume:'Let it run',Dismiss:'Got it!',LateCallback:null})[a];
