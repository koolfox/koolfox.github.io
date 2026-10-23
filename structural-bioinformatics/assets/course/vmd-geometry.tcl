# Teaching protocol, not a reported executed VMD result.
# vmd -dispdev text -e vmd-geometry.tcl -args /absolute/path/3wd5.pdb
if {[llength $argv] != 1} { error "Pass one absolute PDB path after -args" }
set path [lindex $argv 0]
if {![file exists $path]} { error "PDB file not found: $path" }
set refmol [mol new $path type pdb waitfor all]
set movmol [mol new $path type pdb waitfor all]
set selection "protein and chain A and name CA and occupancy > 0"
set ref [atomselect $refmol $selection]
set moving [atomselect $movmol $selection]
if {[$ref num] == 0 || [$ref num] != [$moving num]} { error "Empty or unmatched selection" }
# Same input loaded twice: correspondences are known, not inferred from atom count.
puts "VMD version: [vmdinfo version]"
puts "Selection: $selection"
puts "CA count: [$ref num]"
$moving moveby {10 0 0}
puts "Raw RMSD (A): [measure rmsd $moving $ref]"
puts "Equal-weight CA Rg (A): [measure rg $ref]"
$moving move [measure fit $moving $ref]
puts "Fitted RMSD (A): [measure rmsd $moving $ref]"
$ref delete
$moving delete
mol delete $refmol
mol delete $movmol
quit
