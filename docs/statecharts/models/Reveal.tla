--------------------------- MODULE Reveal ---------------------------
EXTENDS Integers
VARIABLE count
Init == count=0
Compare == count'=1
FreshRender == count'=0
Next == Compare \/ FreshRender
OneExplanation == count \in 0..1
=============================================================================
