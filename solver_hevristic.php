<?php
// initializing
session_start();
$session_started = isset($_SESSION['id']);
$response = Array();
$request = "";

try {
     // check if action specified
    if(!isset($_POST['json'])) throw new Exception("Json parameter is not specified");
    $request = json_decode($_POST['json']);
    if (!isset($request->action)) throw new Exception("Action POST parameter is not specified");

    // check if session already been started
    if (!$session_started) {
        $_SESSION['id'] = rand(1000000000, 10000000000);
    }
    $response['message'] = "Request was handled really nice";
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);


//$test = `"C:/Program Files/swipl/bin/swipl.exe" -s d:/1.pl -g test -t halt`;
//echo $test;
