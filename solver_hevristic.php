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

        if($_SESSION['route_started']) {
            $current_cell = $_SESSION['current_cell'];
        } else {
            $current_cell = clone $startCell;
        }
        $next_step = find_next_step($maze, $endCell, $current_cell);
        if($next_step) {
            $_SESSION['route_started'] = true;
            $_SESSION['maze'] = $maze;
            $response['step_start'] = $next_step[0];
            $response['step_end'] = $next_step[1];
            $response['result'] = "has_next_step";
            $response['message'] = "Next step found: ["
                .$response['step_start']->X."; ".$response['step_start']->Y."],["
                .$response['step_end']->X."; ".$response['step_end']->Y."]. Step coefficient: ".$next_step[1]->f;
            $_SESSION['current_cell'] = $next_step[1];
        } else {
            $response['message'] = "Can't find next step";
            $response['result'] = "fail";
        }
    } else {
        $response['message'] = "Request was handled fine";
    }

} catch (Exception $e) {
    $response['error'] = "Fatal error: ".$e->getMessage();
}


function find_next_step(&$maze, $finish_cell, $current_cell) {
    // if current cell is finish cell then exit
    $current_cell = $maze[$current_cell->X][$current_cell->Y];
    if($current_cell->X == $finish_cell->X && $current_cell->Y == $finish_cell->Y) return false;
    // calculating f for the current cell
    if(!isset($current_cell->f)) {
        $current_cell->f = calculate_f($current_cell, 1, $finish_cell);
        $current_cell->l = 1;
    }
    $current_cell->used = true;

    // calculating f for current cell's neighbors
    if(has_available_neighbors($current_cell, $maze)) {
        $arNeighbors = get_neighbors($current_cell, $maze);

        foreach($arNeighbors as $index => $neighbor) {
            $neighbor->f = calculate_f($neighbor, $current_cell->l + 1, $finish_cell);
            $neighbor->l = $current_cell->l + 1;
        }
    }

    // seeking for points with least f
    $min_f = PHP_INT_MAX;
    $min_f_cells = Array();

    for($i = 0; $i < count($maze); $i++) {
        for($j = 0; $j < count($maze[0]); $j++) {
            $cell = $maze[$i][$j];
            if(isset($cell->f) && !isset($cell->used)) {
                if($cell->f < $min_f) {
                    $min_f_cells = Array($cell);
                    $min_f = $cell->f;
                } else if($cell->f == $min_f) {
                    array_push($min_f_cells, $cell);
                }
            }
        }
    }

    // choosing point that is closest to current point and make a move to it
    $min_distance_from_current_cell = PHP_INT_MAX;
    $closest_cell = null;

    foreach($min_f_cells as $cell_id => $cell) {
        $cell_distance = abs($cell->X - $current_cell->X) + abs($cell->Y - $current_cell->Y);
        if($cell_distance < $min_distance_from_current_cell) {
            $closest_cell = $cell;
            $min_distance_from_current_cell = $cell_distance;
        }
    }
    if(is_null($closest_cell)) throw new Exception("No more cells to move to");

    return Array(get_used_neighbor($closest_cell, $maze), $closest_cell);
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
        if($neighbor_cell[0] > -1 && $neighbor_cell[0] < count($maze) &&
            $neighbor_cell[1] > -1 && $neighbor_cell[1] < count($maze[0]))
        if(cell_is_ground($neighbor_cell[0], $neighbor_cell[1], $maze)) {
            array_push($neighbors, $maze[$neighbor_cell[0]][$neighbor_cell[1]]);
        }
    }
    return $neighbors;
}

function get_used_neighbor($cell, $maze) {
    $neighbors = get_neighbors($cell, $maze);
    foreach($neighbors as $cell_id => $cell) {
        if(isset($cell->used)) return $cell;
    }
    return null;
}

function cell_is_ground($cellX, $cellY, $maze) {
    if(($cellX >= 0 && $cellY >= 0 && $cellX < count($maze) && $cellY < count($maze[0])) &&
        $maze[$cellX][$cellY] && $maze[$cellX][$cellY]->type == 0)
    {
        return true;
    }
    return false;
}

function calculate_f($cell, $route_length, $finish_cell) {
    return $route_length + 2 * pow((pow($finish_cell->X - $cell->X, 2) + pow($finish_cell->Y - $cell->Y, 2)), 0.5);
    /*$X = $cell->X;
    $Y = $cell->Y;
    $finish_x = $finish_cell->X;
    $finish_y = $finish_cell->Y;
    return `"C:/Program Files/swipl/bin/swipl.exe" -s C:/xampp2/htdocs/f.pl -g calculate_f($X,$Y,$route_length,$finish_x,$finish_y) -t halt`;*/
}

echo json_encode($response);


//$test = `"C:/Program Files/swipl/bin/swipl.exe" -s d:/1.pl -g test -t halt`;
//echo $test;
