/**
 * Created by Jack on 01.12.13.
 */


// класс ячейки лабиринта, нужен для упрощения работы с ячейками
// содержит информацию о типе ячейки (стена или проходимая ячейка) и о том, выбрана ячейка или нет
function Cell(cellX, cellY, type) {
    if (!type) type = 0;
    this.bSelected = false;
    this.type = type;
    this.X = cellX;
    this.Y = cellY;
}

// возможные типы ячейки
Cell.TYPE_WALL = 1;
Cell.TYPE_EMPTY = 0;

Cell.prototype.setSelected = function (bSelected) {
    this.bSelected = bSelected;
};

Cell.prototype.isSelected = function () {
    return this.bSelected;
};

Cell.prototype.setType = function (type) {
    this.type = type;
};

Cell.prototype.getType = function () {
    return this.type;
};

function __generateMaze(cellsX, cellsY, funStepGeneratedListener) {
    var cells = [];
    // заполняем весь лабиринт стеной
    for (var cellX = 0; cellX < cellsX; cellX++) {
        cells[cellX] = [];
        for (var cellY = 0; cellY < cellsY; cellY++) {
            cells[cellX][cellY] = new Cell(cellX, cellY, Cell.TYPE_WALL);
        }
    }
    // выбираем начальные точки для рисования туннелей
    var arStartCells = [];
    for (var i = 0; i < 30; i++) {
        var startCell = [Math.round(Math.random() * cellsX), Math.round(Math.random() * cellsY)];
        arStartCells.push(startCell);
    }
    // передаем начальный лабиринт в функцию создания туннелей лабиринта
    __generateMazeRecursive(cells, arStartCells, funStepGeneratedListener);
    return cells;
}

function __generateMazeRecursive(cells, arGrowingCells, funStepGeneratedListener) {
    var arGrowingCellsNew = [];
    for (var i in arGrowingCells) {
        var currentCell = arGrowingCells[i];
        // find new cell to continue path
        var arSideCells = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
        ];
        var bNewCellFound = false;
        var arAvailableSideCells = [0, 1, 2, 3];
        var sideCell;
        while (!bNewCellFound) {
            if (arAvailableSideCells.length > 0) {
                var randomIndex = Math.floor(Math.random() * (arAvailableSideCells.length - 0.01));
                var sideCellIndex = arAvailableSideCells[randomIndex];
                arAvailableSideCells.splice(randomIndex, 1);
                sideCell = [currentCell[0] + arSideCells[sideCellIndex][0], currentCell[1] + arSideCells[sideCellIndex][1]];
                if (cells[sideCell[0]] &&
                    cells[sideCell[0]][sideCell[1]] &&
                    cells[sideCell[0]][sideCell[1]].type != Cell.TYPE_EMPTY) {
                    // check if we could place new path cell
                    var zeroIndex = arSideCells[sideCellIndex][0] == 0 ? 0 : 1;
                    var j = -1;
                    var arTmpSideCells = [];
                    while (j < 2) {
                        arTmpSideCells[(j + 1) / 2] = [];
                        var tmpSideCell = [];
                        for (var k in currentCell) {
                            if (k == zeroIndex) {
                                tmpSideCell[k] = currentCell[k] + j;
                            } else {
                                tmpSideCell[k] = currentCell[k] + arSideCells[sideCellIndex][k];
                            }
                        }
                        arTmpSideCells[(j + 1) / 2][0] = tmpSideCell;

                        tmpSideCell = [];
                        for (var k in currentCell) {
                            if (k == zeroIndex) {
                                tmpSideCell[k] = currentCell[k] + j;
                            } else {
                                tmpSideCell[k] = currentCell[k];
                            }
                        }
                        arTmpSideCells[(j + 1) / 2][1] = tmpSideCell;

                        j += 2;
                    }
                    var bCellValid = true;
                    for (var j in arTmpSideCells) {
                        if (cells[arTmpSideCells[j][0][0]] &&
                            cells[arTmpSideCells[j][0][0]][arTmpSideCells[j][0][1]] &&
                            cells[arTmpSideCells[j][0][0]][arTmpSideCells[j][0][1]].type == Cell.TYPE_EMPTY &&
                            cells[arTmpSideCells[j][1][0]] &&
                            cells[arTmpSideCells[j][1][0]][arTmpSideCells[j][1][1]] &&
                            cells[arTmpSideCells[j][1][0]][arTmpSideCells[j][1][1]].type == Cell.TYPE_EMPTY) {
                            bCellValid = false;
                        }
                    }
                    if (bCellValid) {
                        bNewCellFound = true;
                    }
                }
            } else {
                sideCell = [];
                bNewCellFound = true;
            }
        }
        // if found add it to growing cells and set maze cell as empty
        if (sideCell.length > 0) {
            if (Math.random() > 0.005) {
                arGrowingCellsNew.push(sideCell);
            }
            cells[sideCell[0]][sideCell[1]].type = Cell.TYPE_EMPTY;
        }
        // if current cell has no more place to move, than delete it from growing cells
        var bNoAvailableMove = true;
        for (var j in arSideCells) {
            if (cells[currentCell[0] + arSideCells[j][0]] &&
                cells[currentCell[0] + arSideCells[j][0]][currentCell[0] + arSideCells[j][1]] &&
                cells[currentCell[0] + arSideCells[j][0]][currentCell[0] + arSideCells[j][1]].type != Cell.TYPE_EMPTY) {
                bNoAvailableMove = false;
                break;
            }
        }
        var probabilityOfDelete;
        if (bNoAvailableMove) {
            probabilityOfDelete = 1;
        } else {
            // else with probability delete current cell from growing cells
            probabilityOfDelete = 0.88;
        }
        if (Math.random() > probabilityOfDelete) {
            arGrowingCellsNew.push(currentCell);
        }
    }
    // if growing cells is not empty then call itself
    if (arGrowingCellsNew.length > 0) {
        var generateFunction = function () {
            funStepGeneratedListener();
            __generateMazeRecursive(cells, arGrowingCellsNew, funStepGeneratedListener);
        };
        requestAnimFrame(generateFunction);
    }
}