<?php
/**
 * Created by PhpStorm.
 * User: Jack
 * Date: 10.12.13
 * Time: 22:58
 */

class Solver {
    private $maze;
    private $start_cell;
    private $finish_cell;
    private $current_cell;
    /** @var Step */
    private $step;

    function Solver(&$maze, $start_cell, $finish_cell, &$current_cell) {
        $this->maze = $maze;
        $this->start_cell = $start_cell;
        $this->finish_cell = $finish_cell;
        $this->current_cell = $current_cell;
    }

    public function getStep() {
        $this->find_next_step();
        return $this->step;
    }

    public function getRoute() {

    }

    private function find_next_step() {
        $step = null;
        if($this->current_cell->X == $this->finish_cell->X && $this->current_cell->Y == $this->finish_cell->Y) {
            $this->step = new Step($this->current_cell, null, Step::STATUS_FINISH_REACHED);
            return;
        }
        if(!isset($this->current_cell->f)) {
            $this->calculate_f($this->current_cell);
        }
        $this->current_cell->used = true;

        if($this->has_available_neighbors($this->current_cell)) {
            $arNeighbors = $this->get_neighbors($this->current_cell);

            foreach($arNeighbors as $index => $neighbor) {
                $this->calculate_f($neighbor);
            }
        }

        $min_f = PHP_INT_MAX;
        $min_f_cells = Array();

        for($i = 0; $i < count($this->maze); $i++) {
            for($j = 0; $j < count($this->maze[0]); $j++) {
                $cell = $this->maze[$i][$j];
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

        $min_distance_from_current_cell = PHP_INT_MAX;
        $closest_cell = null;

        foreach($min_f_cells as $cell_id => $cell) {
            $cell_distance = abs($cell->X - $this->current_cell->X) + abs($cell->Y - $this->current_cell->Y);
            if($cell_distance < $min_distance_from_current_cell) {
                $closest_cell = $cell;
                $min_distance_from_current_cell = $cell_distance;
            }
        }
        if(is_null($closest_cell)) {
            $this->step = new Step($this->current_cell, null, Step::STATUS_NO_MORE_SELLS_TO_STEP);
            return;
        }

        $this->step = new Step($this->get_used_neighbor($closest_cell), $closest_cell, Step::STATUS_STEP_FOUND);
    }

    private function has_available_neighbors($cell) {
        if(
            $this->cell_is_ground($cell->X - 1, $cell->Y) ||
            $this->cell_is_ground($cell->X + 1, $cell->Y) ||
            $this->cell_is_ground($cell->X, $cell->Y - 1) ||
            $this->cell_is_ground($cell->X, $cell->Y + 1)
        ) {
            return true;
        }
        return false;
    }

    private function get_neighbors($cell) {
        $probable_neighbor_cells = array(
            array($cell->X - 1, $cell->Y),
            array($cell->X + 1, $cell->Y),
            array($cell->X, $cell->Y - 1),
            array($cell->X, $cell->Y + 1)
        );
        $neighbors = array();
        foreach($probable_neighbor_cells as $neighbor_cell) {
            if(
                $neighbor_cell[0] > -1 && $neighbor_cell[0] < count($this->maze) &&
                $neighbor_cell[1] > -1 && $neighbor_cell[1] < count($this->maze[0])
            ) {
                if($this->cell_is_ground($neighbor_cell[0], $neighbor_cell[1])) {
                    array_push($neighbors, $this->maze[$neighbor_cell[0]][$neighbor_cell[1]]);
                }
            }
        }
        return $neighbors;
    }

    private function get_used_neighbor($cell) {
        $neighbors = $this->get_neighbors($cell);
        foreach($neighbors as $cell_id => $neighbor) {
            if(isset($neighbor->used)) return $neighbor;
        }
        return $cell;
    }

    private function cell_is_ground($cellX, $cellY) {
        if(($cellX >= 0 && $cellY >= 0 && $cellX < count($this->maze) && $cellY < count($this->maze[0])) &&
            $this->maze[$cellX][$cellY] && $this->maze[$cellX][$cellY]->type == 0)
        {
            return true;
        }
        return false;
    }

    private function calculate_f(&$cell) {
        $route_length = isset($this->current_cell->l) ? $this->current_cell->l + 1 : 0;
        $cell->l = $route_length;
        $cell->f = $route_length + 2 * pow((pow($this->finish_cell->X - $cell->X, 2) + pow($this->finish_cell->Y - $cell->Y, 2)), 0.5);
    }
}

class Step {
    private $cell_from;
    private $cell_to;
    private $status;

    const STATUS_STEP_FOUND = 1;
    const STATUS_FINISH_REACHED = 2;
    const STATUS_NO_MORE_SELLS_TO_STEP = 3;

    function Step($cell_from, $cell_to, $status) {
        $this->cell_from = $cell_from;
        $this->cell_to = $cell_to;
        $this->status = $status;
    }

    function get_cell_from() {
        return $this->cell_from;
    }

    function get_cell_to() {
        return $this->cell_to;
    }

    function get_status() {
        return $this->status;
    }
}