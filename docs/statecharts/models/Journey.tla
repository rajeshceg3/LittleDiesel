--------------------------- MODULE Journey ---------------------------
EXTENDS Integers
VARIABLES phase, stroke, answered
vars == <<phase, stroke, answered>>
Init == /\ phase = "Introduction" /\ stroke = 0 /\ answered = FALSE
Start == /\ phase = "Introduction" /\ phase' = "Predict" /\ UNCHANGED <<stroke, answered>>
Answer == /\ phase = "Predict" /\ phase' = "Feedback" /\ answered' = TRUE /\ UNCHANGED stroke
Skip == /\ phase = "Predict" /\ phase' = "Ready" /\ UNCHANGED <<stroke, answered>>
WatchAnswered == /\ phase = "Feedback" /\ phase' = "Moving" /\ UNCHANGED <<stroke, answered>>
WatchSkipped == /\ phase = "Ready" /\ phase' = "Moving" /\ UNCHANGED <<stroke, answered>>
Finish == /\ phase = "Moving" /\ phase' = "Held" /\ UNCHANGED <<stroke, answered>>
NextIdea == /\ phase = "Held" /\ stroke < 3 /\ stroke' = stroke + 1 /\ phase' = "Predict" /\ answered' = FALSE
NewCase == /\ phase = "Held" /\ stroke = 3 /\ phase' = "Transfer" /\ UNCHANGED <<stroke, answered>>
AnswerCase == /\ phase = "Transfer" /\ phase' = "Transfer feedback" /\ UNCHANGED <<stroke, answered>>
TeachBack == /\ phase \in {"Transfer", "Transfer feedback"} /\ phase' = "Explain it" /\ UNCHANGED <<stroke, answered>>
Previous == /\ phase \in {"Predict", "Feedback", "Ready", "Held", "Transfer", "Transfer feedback", "Explain it"}
 /\ (IF phase \in {"Transfer", "Transfer feedback", "Explain it"} THEN /\ stroke' = 3 /\ phase' = "Held"
 ELSE IF stroke > 0 THEN /\ stroke' = stroke - 1 /\ phase' = "Held"
 ELSE /\ stroke' = 0 /\ phase' = "Introduction")
 /\ answered' = FALSE
Restart == /\ phase # "Moving" /\ phase' = "Introduction" /\ stroke' = 0 /\ answered' = FALSE
Wait == /\ phase = "Explain it" /\ UNCHANGED vars
Next == Start \/ Answer \/ Skip \/ WatchAnswered \/ WatchSkipped \/ Finish \/ NextIdea \/ NewCase \/ AnswerCase \/ TeachBack \/ Previous \/ Restart \/ Wait
\* The lesson stays within its four named strokes.
FourStrokes == stroke \in 0..3
\* Feedback follows a submitted answer, never a skip.
FeedbackHasAnswer == phase = "Feedback" => answered
\* The transfer case is reached after the fourth stroke.
TransferAfterExhaust == phase \in {"Transfer", "Transfer feedback", "Explain it"} => stroke = 3
=============================================================================
