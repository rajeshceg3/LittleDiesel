/* A reasoning lesson, separate from the engine's moving mechanism.
   Answer history is evidence of an interaction, never a mastery score. */
export const questions = [
  {title:'What does the first downward move draw in?', choices:['Air','Fuel and air already mixed','Used gas'], answer:0,
   why:['Yes. The inlet opens and the descending piston makes room for fresh air. Fuel comes later.','This diesel takes in air first. The injector adds fuel after the air has been compressed.','Used gas leaves through the other valve during exhaust. This move draws fresh air in.'], part:'air valve'},
  {title:'What must the valves do while the piston squeezes the air?', choices:['Both stay shut','The inlet stays open','The exhaust stays open'], answer:0,
   why:['Shut valves trap the air. The rising piston compresses it, raising its temperature.','An open inlet lets air escape instead of trapping it for compression.','An open exhaust lets air escape. Both valves close for compression.'], part:'valves'},
  {title:'What starts the power stroke in this diesel?', choices:['Fuel enters the hot compressed air','A spark plug fires','Fresh air alone burns'], answer:0,
   why:['Fuel ignites in the hot compressed air. Expanding gas pushes the piston, rod and crank.','This engine has no spark plug. Compression heats the air, then injected fuel ignites in it.','Air supports combustion, but the fuel supplies the chemical energy. It is injected into the hot air.'], part:'fuel injector'},
  {title:'How does the engine clear the used gas?', choices:['Piston rises with exhaust open','Piston drops with inlet open','Both valves stay shut'], answer:0,
   why:['The rising piston pushes used gas through the open exhaust. Then fresh air can enter again.','That is intake. Exhaust needs the other valve open and the piston rising.','Closed valves trap the gas. Exhaust opens to let the rising piston push it out.'], part:'exhaust valve'},
];
export const transfer = {
 title:'A new case: the inlet stays open during the squeeze. What changes?',
 choices:['Air can escape, so it is not compressed as intended','Nothing: fuel alone makes the air hot','The open valve creates a spark'],answer:0,
 why:['Right. Trapping the air matters. An open valve undermines the compression that heats it before injection.','Fuel is injected later. First the rising piston compresses trapped air and heats it.','A valve controls gas flow, not sparks. This diesel relies on heat from compression.'],part:'inlet valve'
};
export function createLesson(){return {phase:'orient',stroke:0,choices:[null,null,null,null],transfer:null};}
export function reduceLesson(s,a){
 const n={...s,choices:[...s.choices]};
 if(a.type==='reset')return createLesson();
 if(a.type==='start'){n.phase='predict';return n;}
 if(a.type==='answer'&&s.phase==='predict'&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3){n.choices[s.stroke]=a.choice;n.phase='feedback';return n;}
 if(a.type==='skip'&&s.phase==='predict'){n.phase='ready';return n;}
 if(a.type==='continue'&&s.phase==='feedback'){n.phase='ready';return n;}
 if(a.type==='move'&&s.phase==='ready'){n.phase='moving';return n;}
 if(a.type==='finish'&&s.phase==='moving'){n.phase='held';return n;}
 if(a.type==='next'&&s.phase==='held'){if(s.stroke===3)n.phase='transfer';else{n.stroke++;n.phase='predict';}return n;}
 if(a.type==='previous'&&['predict','ready','feedback','held','transfer','transferFeedback','teachback'].includes(s.phase)){
   if(s.phase==='transfer'||s.phase==='transferFeedback'||s.phase==='teachback'){n.stroke=3;n.phase='held';}
   else if(s.stroke>0){n.stroke--;n.phase='held';}else n.phase='orient';return n;
 }
 if(a.type==='answerTransfer'&&s.phase==='transfer'&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3){n.transfer=a.choice;n.phase='transferFeedback';return n;}
 if(a.type==='teachback'&&['transfer','transferFeedback'].includes(s.phase)){n.phase='teachback';return n;}
 return s;
}
