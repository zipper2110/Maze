<?php
//echo exec('"C:\\Program Files\\swipl\\bin\\swipl.exe" -s \"d:\\1.pl" -g test -t halt', $output);
//`C:/Program Files/7-Zip/7zFM.exe`;
//echo `"C:/Program Files/7-Zip/7z.exe" -version`;

$test = `"C:/Program Files/swipl/bin/swipl.exe" -s d:/1.pl -g test -t halt`;
echo $test;