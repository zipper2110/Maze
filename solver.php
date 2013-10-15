<?php

$return_status = '';
$return_message = '';
$return_value = '';

// задержка ответа для имитации долгих вычислений
sleep(3);


$error_text = "No errors";

// создаем маршрут
$result = create_route($error_text);

// проверяем успешность прокладки маршрута
if ($result === -1) {
    $return_status = 1;
    $return_message = $error_text;
} else {
    $return_status = 0;
    $return_message = "Данные получены успешно!";
    $return_value = $result;
}

// готовим данные для отправки на клиент
echo return_results($return_status, $return_message, $return_value);

// функция прокладывает маршрут
function create_route(&$error_text)
{
    $maze_info = $_POST['mazeInfo'];
    $start_cell_tmp = $_POST['start'];
    $end_cell_tmp = $_POST['finish'];
    if ($start_cell_tmp != "") {
        $start_cell = explode(",", $_POST['start']);
    } else {
        $error_text = "Не найдена точка старта";
        return -1;
    }
    if ($end_cell_tmp != "") {
        $end_cell = explode(",", $_POST['finish']);
    } else {
        $error_text = "Не найдена точка финиша";
        return -1;
    }
    $maze_info_tmp_array = explode(";", $maze_info);
    $maze_info_array = Array();
    foreach ($maze_info_tmp_array as $i) {
        array_push($maze_info_array, explode(",", $i));
    }
    $route_map = Array();
    $wave_cells = Array();
    foreach ($maze_info_array as $row_key => $row) {
        foreach ($row as $col_key => $cell) {
            $route_map[$row_key][$col_key] = -1;
        }
    }

    $route_map[$start_cell[0]][$start_cell[1]] = 0;

    array_push($wave_cells, $start_cell);
    // going forward
    while (count($wave_cells) > 0) {
        $wave_cells_next = Array();
        foreach ($wave_cells as $wave_cell_id => $wave_cell) {
            // check 4 sides of cells for value
            $side_cells = Array();
            $side_cells[] = Array($wave_cell[0], $wave_cell[1] - 1);
            $side_cells[] = Array($wave_cell[0], $wave_cell[1] + 1);
            $side_cells[] = Array($wave_cell[0] + 1, $wave_cell[1]);
            $side_cells[] = Array($wave_cell[0] - 1, $wave_cell[1]);
            // if it's end sell then finish reached
            foreach ($side_cells as $side_cell_id => $side_cell) {
                if (isset($maze_info_array[$side_cell[0]][$side_cell[1]])) {
                    $maze_cell_value = & $maze_info_array[$side_cell[0]][$side_cell[1]];
                    $route_cell_value = & $route_map[$side_cell[0]][$side_cell[1]];

                    if ($maze_cell_value < 1) {
                        if ($route_cell_value == -1) {
                            $route_cell_value = $route_map[$wave_cell[0]][$wave_cell[1]] + 1;
                            $wave_cells_next[] = $side_cell;
                        }
                    } else {
                        $route_cell_value = -2;
                    }
                }
            }
        }
        $wave_cells = $wave_cells_next;
    }
    // going back
    $route = Array();
    $is_route_end = false;
    $current_cell = $end_cell;
    array_unshift($route, $current_cell);
    while(!$is_route_end) {
        $side_cells = Array();
        $side_cells[] = Array($current_cell[0], $current_cell[1] - 1);
        $side_cells[] = Array($current_cell[0], $current_cell[1] + 1);
        $side_cells[] = Array($current_cell[0] + 1, $current_cell[1]);
        $side_cells[] = Array($current_cell[0] - 1, $current_cell[1]);

        $next_step_found = false;
        foreach ($side_cells as $side_cell_id => $side_cell) {
            if (isset($maze_info_array[$side_cell[0]][$side_cell[1]])) {
                $route_cell_value = & $route_map[$side_cell[0]][$side_cell[1]];
                $current_cell_value = $route_map[$current_cell[0]][$current_cell[1]];

                if($route_cell_value == $current_cell_value - 1) {
                    $next_step_found = true;
                    $current_cell = $side_cell;
                    array_unshift($route, $current_cell);
                    break;
                }
            }
        }
        if(!$next_step_found) {
            $error_text = "Маршрут не найден";
            return -1;
        }
        if($route_map[$current_cell[0]][$current_cell[1]] == 0) {
            $is_route_end = true;
        }
    }
    $route_tmp = Array();
    foreach($route as $cell) {
        array_push($route_tmp, implode(",", $cell));
    }
    $s_route = implode(";", $route_tmp);
    return $s_route;
}

// функция форматирует данные для вывода на клиент
function return_results($status, $message, $value) {
    return "status=".$status."&message=".$message."&value=".$value;
}