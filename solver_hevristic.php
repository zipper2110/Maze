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
    $response['action'] = $request->action;

    // check if session already been started
    if (!$session_started) {
        $_SESSION['id'] = rand(1000000000, 10000000000);
    }
    if($request->action == "set_info") {
        if(!isset($request->maze)) throw new Exception('Action set_info: "maze" parameter is not specified');
        if(!isset($request->startCell)) throw new Exception('Action set_info: "startCell" parameter is not specified');
        if(!isset($request->endCell)) throw new Exception('Action set_info: "endCell" parameter is not specified');
        $maze = $request->maze;
        $startCell = $request->startCell;
        $endCell = $request->endCell;

        if(count($maze) <= 0) throw new Exception('Action set_info: "maze" parameter has no elements');
        if(count($startCell) < 2) throw new Exception('Action set_info: start cell is not found');
        if(count($endCell) < 2) throw new Exception('Action set_info: finish cell is not found');
        // TODO: проверить, что старт и финиш находятся на проходимой территории и не являются одной точкой

        $response['message'] = "Maze info was received successfully";
    } else {
        $response['message'] = "Request was handled fine";
    }

} catch (Exception $e) {
    $response['error'] = "Fatal error: ".$e->getMessage();
}

function findNextStep($maze, $route, $finish_cell) {
    // если текущая точка имеет точки, куда можно сходить
        // берем случайную соседнюю точку
        // считаем ее f
        // если f точки <= текущему, то добавляем ее в route
        // если же нет, то берем другую соседнюю точку
        // далее, если точек с f <= текущему не найдено, то убираем эту точку из маршрута и уходим на следующую итерацию
        // если же точка найдена, то добавляем ее в маршрут и уходим на следующую итерацию
    // если текущая точка не имеет точек для хода, убираем ее из маршрута и идем на следующую итерацию
}

echo json_encode($response);


//$test = `"C:/Program Files/swipl/bin/swipl.exe" -s d:/1.pl -g test -t halt`;
//echo $test;
