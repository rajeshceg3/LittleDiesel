--------------------------- MODULE Ownership ---------------------------
VARIABLES playback, note
vars == <<playback,note>>
Init == /\ playback="Continuous" /\ note="Absent"
Power == /\ playback="Continuous" /\ note="Absent" /\ note'="Pending" /\ UNCHANGED playback
Callback == /\ playback="Continuous" /\ note="Pending" /\ note'="Visible" /\ UNCHANGED playback
Step == /\ playback="Continuous" /\ playback'="Stepped" /\ note'="Absent"
Resume == /\ playback="Stepped" /\ playback'="Continuous" /\ note'="Absent"
Dismiss == /\ note="Visible" /\ note'="Absent" /\ UNCHANGED playback
LateCallback == /\ playback="Stepped" /\ UNCHANGED vars
Next == Power \/ Callback \/ Step \/ Resume \/ Dismiss \/ LateCallback
OwnedNote == playback="Stepped" => note="Absent"
=============================================================================
