<?php
/**
 * Created by PhpStorm.
 * User: Jack
 * Date: 10.12.13
 * Time: 23:03
 */

// check if request has required fields
if (!isset($_POST['json'])) throw new Exception('"json" POST parameter is not specified');
$request = json_decode($_POST['json']);
if (!isset($request->action)) throw new Exception('"action" POST parameter is not specified');

$response['action'] = $request->action;

session_start();
$error = check_info($request);
if($error) {
    throw new Exception($error);
}
require('./Solver.php');

if ($request->action == "set_info") {
    set_info($request, $response);
} else if ($request->action == "get_step") {
    get_step($response);
} else {
    $response['message'] = "Unknown action: " . $request->action;
}


function check_info($request)
{
    $error = false;
    if ($request->action == "set_info") {
        if (!isset($request->maze)) $error = '"maze" parameter is not specified';
        if (!isset($request->startCell)) $error = '"startCell" parameter is not specified';
        if (!isset($request->endCell)) $error = '"endCell" parameter is not specified';

        if (count($request->maze) <= 0) $error = '"maze" parameter has no elements';
        if (!isset($request->startCell) || !isset($request->startCell->type)) $error = 'start cell is not found';
        if ($request->startCell->type != 0) $error = 'start cell is wall';
        if (!isset($request->endCell) || !isset($request->endCell->type)) $error = 'finish cell is not found';
        if ($request->endCell->type != 0) $error = 'finish cell is wall';

        if (
            $request->startCell->X == $request->endCell->X &&
            $request->startCell->Y == $request->endCell->Y
        ) {
            $error = 'start and finish are at the same place';
        }
    } else if ($request->action == "get_step") {
        if (!isset($_SESSION['info_ok']) || $_SESSION['info_ok'] != true) $error = "You should set your info before start solve";
        if(!isset($_SESSION['solver'])) $_SESSION['solver'] = false;
    }
    return $error;
}

function set_info($request, &$response)
{
    $_SESSION['startCell'] = $request->startCell;
    $_SESSION['endCell'] = $request->endCell;
    $_SESSION['maze'] = $request->maze;

    $_SESSION['current_cell'] = $request->maze[$request->startCell->X][$request->startCell->Y];
    $_SESSION['info_ok'] = true;

    $response['message'] = "Maze info received successfully";
}

function get_step(&$response)
{
    /** @var Solver $solver */
    $solver = new Solver($_SESSION['maze'], $_SESSION['startCell'], $_SESSION['endCell'], $_SESSION['current_cell']);

    $next_step = $solver->getStep();
    if ($next_step) {
        $_SESSION['current_cell'] = $next_step->get_cell_to();

        $response['step_start'] = $next_step->get_cell_from();
        $response['step_end'] = $next_step->get_cell_to();
        $response['result'] = $next_step->get_status();
    } else {
        $response['error'] = 'can\'t find next step';
    }
}

echo json_encode($response);
