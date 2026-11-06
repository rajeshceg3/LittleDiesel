export const title = 'Little Diesel: one learner-controlled stroke';
export const state = v => v.phase;
export const group = v => ['Predict','Feedback','Ready'].includes(v.phase)?'thinking':['Moving','Held'].includes(v.phase)?'mechanism':'reflection';
export const colors = {thinking:'teal', mechanism:'orange',reflection:'blue'};
export const step = (a,f,t) => ({Start:'Think through the first move',Answer:'Choose an answer',Skip:'Show me this move first',WatchAnswered:'Watch it',WatchSkipped:'Watch it',Finish:'One stroke finishes',NextIdea:'Next idea [intake, squeeze or power]',NewCase:'Try a new case [after exhaust]',AnswerCase:'Choose a case answer',TeachBack:f.phase==='Transfer'?'Think aloud, then see takeaway':'Explain it in your own words',Previous:null,Restart:null,Wait:null})[a];
