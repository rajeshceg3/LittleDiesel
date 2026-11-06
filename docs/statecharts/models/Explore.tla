--------------------------- MODULE Explore ---------------------------
VARIABLE screen
Init == screen = "Meet it"
Meet == screen' = "Meet it"
Peek == screen' = "Peek inside"
Learn == screen' = "Lesson introduction"
Part == /\ screen = "Peek inside" /\ screen' = "Part detail"
Close == /\ screen = "Part detail" /\ screen' = "Peek inside"
Run == /\ screen \in {"Lesson introduction", "Held stroke"} /\ screen' = "Continuous cycle"
Pause == /\ screen = "Continuous cycle" /\ screen' = "Finishing current stroke"
Finish == /\ screen = "Finishing current stroke" /\ screen' = "Held stroke"
Limits == /\ screen = "Lesson introduction" /\ screen' = "Model limits"
Return == /\ screen = "Model limits" /\ screen' = "Lesson introduction"
Next == Meet \/ Peek \/ Learn \/ Part \/ Close \/ Run \/ Pause \/ Finish \/ Limits \/ Return
KnownScreen == screen \in {"Meet it", "Peek inside", "Lesson introduction", "Part detail", "Continuous cycle", "Finishing current stroke", "Held stroke", "Model limits"}
=============================================================================
