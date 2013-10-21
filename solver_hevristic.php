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
        if(!isset($request->maze)) throw new Exception('"maze" parameter is not specified');
        if(!isset($request->startCell)) throw new Exception('"startCell" parameter is not specified');
        if(!isset($request->endCell)) throw new Exception('"endCell" parameter is not specified');
        $maze = $request->maze;
        $startCell = $request->startCell;
        $endCell = $request->endCell;

        if(count($maze) <= 0) throw new Exception('"maze" parameter has no elements');
        if(!$startCell) throw new Exception('start cell is not found');
        if($startCell->type != 0) throw new Exception('start cell is wall');
        if(!$endCell) throw new Exception('finish cell is not found');
        if($endCell->type != 0) throw new Exception('finish cell is wall');

        if($startCell->X == $endCell->X && $startCell->Y == $endCell->Y) throw new Exception('start and finish are at the same place');

        // TODO: проверить, что старт и финиш находятся на проходимой территории и не являются одной точкой

        $_SESSION['info_ok'] = true;
        $_SESSION['route_started'] = false;
        $_SESSION['startCell'] = $startCell;
        $_SESSION['endCell'] = $endCell;
        $_SESSION['maze'] = $maze;

        $response['message'] = "Maze info was received successfully";
    } else if($request->action == "get_step") {
        if(!isset($_SESSION['info_ok']) || $_SESSION['info_ok'] != true) throw new Exception("You should set your info before start solve");
        $startCell = $_SESSION['startCell'];
        $endCell = $_SESSION['endCell'];
        $maze = $_SESSION['maze'];

        $route = null;
        if($_SESSION['route_started']) {
            $route = $_SESSION['route'];
        } else {
            $route = array($startCell);
        }

        if(find_next_step($maze, $route, $endCell)) {
            $_SESSION['route'] = $route;
            $_SESSION['route_started'] = true;
            $_SESSION['maze'] = $maze;
            $response['step_start'] = $route[count($route) - 2];
            $response['step_end'] = $route[count($route) - 1];
            $response['message'] = "Next step found: ["
                .$response['step_start']->X."; ".$response['step_start']->Y."],["
                .$response['step_end']->X."; ".$response['step_end']->Y."]";
        } else {
            $response['message'] = "Can't find next step";
        }
    } else {
        $response['message'] = "Request was handled fine";
    }

} catch (Exception $e) {
    $response['error'] = "Fatal error: ".$e->getMessage();
}

function find_next_step($maze, &$route, $finish_cell) {
    if(count($route) <= 0) throw new Exception("WTF?!? No route points left");

    $current_cell = $route[count($route) - 1];
    if(!isset($current_cell->f)) {
        $current_cell->f = calculate_f($current_cell, count($route) - 1, $finish_cell);
    }

    // если текущая точка имеет точки, куда можно сходить
    if(has_available_neighbors($current_cell, $maze)) {
        $arNeighbors = get_neighbors($current_cell, $maze);
        $next_turn_cell = null;
        $min_f = PHP_INT_MAX;
        $min_f_neighbor_index = -1;

        // берем все эти точки, считаем их f
        // выбираем из них точку с наименьшим f
        foreach($arNeighbors as $index => $neighbor) {
            $f = calculate_f($neighbor, count($route) + 1, $finish_cell);
            $neighbor->f = $f;
            if($f < $min_f) {
                $min_f = $f;
                $min_f_neighbor_index = $index;
            }
        }

        // если f точки <= текущему, то добавляем ее в route
        if($min_f_neighbor_index > 0 && $min_f <= $current_cell->f) {
            // если точка найдена, то добавляем ее в маршрут и уходим на следующую итерацию
            array_push($route, $arNeighbors[$min_f_neighbor_index]);
            return true;
        } else {
            // если точек с f <= текущему не найдено, то убираем эту точку из маршрута и уходим на следующую итерацию
            array_pop($route);
            return find_next_step($maze, $route, $finish_cell);
        }
    } else {
        // если текущая точка не имеет точек для хода, убираем ее из маршрута и идем на следующую итерацию
        array_pop($route);
        return find_next_step($maze, $route, $finish_cell);
    }
}

function has_available_neighbors($cell, $maze) {
    if(cell_is_ground($cell->X - 1, $cell->Y, $maze) ||
        cell_is_ground($cell->X + 1, $cell->Y, $maze) ||
        cell_is_ground($cell->X, $cell->Y - 1, $maze) ||
        cell_is_ground($cell->X, $cell->Y + 1, $maze)) {
        return true;
    }
    return false;
}

function get_neighbors($cell, $maze) {
    $probable_neighbor_cells = array(array($cell->X - 1, $cell->Y),
        array($cell->X + 1, $cell->Y),
        array($cell->X, $cell->Y - 1),
        array($cell->X, $cell->Y + 1)
    );
    $neighbors = array();
    foreach($probable_neighbor_cells as $neighbor_cell) {
        if(cell_is_ground($neighbor_cell[0], $neighbor_cell[1], $maze)) {
            array_push($neighbors, $maze[$neighbor_cell[0]][$neighbor_cell[1]]);
        }
    }
    return $neighbors;
}

function cell_is_ground($cellX, $cellY, $maze) {
    if($maze[$cellX][$cellY] && $maze[$cellX][$cellY]->type == 0) return true;
    return false;
}

function calculate_f($cell, $route_length, $finish_cell) {
    return $route_length + 2 * (abs($finish_cell->X - $cell->X) + abs($finish_cell->Y - $cell->Y));
}

echo json_encode($response);


//$test = `"C:/Program Files/swipl/bin/swipl.exe" -s d:/1.pl -g test -t halt`;
//echo $test;
