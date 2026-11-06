--------------------------- MODULE Explore ---------------------------
VARIABLE screen
Init == screen = "Meet it"
Meet == /\ screen="Peek inside" /\ screen'="Meet it"
Peek == /\ screen="Meet it" /\ screen'="Peek inside"
Learn == /\ screen \in {"Meet it","Peek inside"} /\ screen'="Lesson introduction"
Part == /\ screen="Peek inside" /\ screen'="Part detail"
Close == /\ screen="Part detail" /\ screen'="Peek inside"
More == /\ screen="Lesson introduction" /\ screen'="More options"
ReturnMenu == /\ screen="More options" /\ screen'="Lesson introduction"
Explore == /\ screen \in {"Lesson introduction","More options","Held stroke","Continuous cycle"} /\ screen'="Peek inside"
Run == /\ screen="More options" /\ screen'="Continuous cycle"
Pause == /\ screen="Continuous cycle" /\ screen'="Finishing current stroke"
Finish == /\ screen="Finishing current stroke" /\ screen'="Held stroke"
Limits == /\ screen="More options" /\ screen'="Model limits"
Return == /\ screen="Model limits" /\ screen'="Lesson introduction"
Next == Meet \/ Peek \/ Learn \/ Part \/ Close \/ More \/ ReturnMenu \/ Explore \/ Run \/ Pause \/ Finish \/ Limits \/ Return
KnownScreen == screen \in {"Meet it","Peek inside","Lesson introduction","Part detail","More options","Continuous cycle","Finishing current stroke","Held stroke","Model limits"}
=============================================================================
