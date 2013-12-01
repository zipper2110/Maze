// функция для совершения действия с задержкой (для анимированного рисования)
window.requestAnimFrame = (function (callback) {
    return function (callback) {
        window.setTimeout(callback, 40);
    };
})();

var MODE_DEFAULT = "Обычный";
var MODE_PICK_START_POINT = "Выбор начальной точки";
var MODE_PICK_END_POINT = "Выбор конечной точки";
var MODE_DRAW_WALL = "Рисование стены";
var MODE_DRAW_PATH = "Рисование прохода";

/*
 Функция "Maze" создает javascript-прототип (или, иначе говоря, класс) объекта лабиринта. Этому прототипу назначаются
 свои функции (иначе говоря, методы класса).
 */

// функция-конструктор объекта лабиринта
function Maze(canvasObject, cellsX, cellsY, wallTextureImg, pathTextureImg, startFlagImg, finishFlagImg) {
    /** @type {HTMLElement} */
    this.canvas = canvasObject;
    this.canvasContext = this.canvas.getContext("2d");
    this.cellsX = cellsX;
    this.cellsY = cellsY;
    this.canvasWidth = canvasObject.width;
    this.canvasHeight = canvasObject.height;
    this.cellWidth = this.canvasWidth / cellsX;
    this.cellHeight = this.canvasHeight / cellsY;

    this.mode = MODE_DEFAULT;

    /** @type {Array<Array<Cell>>} */
    this.cells = [];
    this.startCell = null;
    this.endCell = null;

    this.FILL_STYLE_EMPTY_CELL = this.canvasContext.createPattern(pathTextureImg, 'repeat');
    this.FILL_STYLE_BLOCK_CELL = this.canvasContext.createPattern(wallTextureImg, 'repeat');
    this.FILL_STYLE_BACKGROUND = "#000000";

    this.startFlagImage = startFlagImg;
    this.finishFlagImage = finishFlagImg;

    this.funPointPickHandler = null;
    this.pointPickListener = null;

    this.statusChangeListener = null;
    this.modeChangeListener = null;

    this.generate();

    /** @type Solver */
    this.solver = null;
}

/**
 * функция создания случайного лабиринта
 */
Maze.prototype.generate = function () {
    this.clear();
    this.generateCells();
    this.refresh();
};

/**
 * стирает лабиринт
 */
Maze.prototype.clear = function () {
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            if (!this.cells[cellX]) this.cells[cellX] = [];
            this.cells[cellX][cellY] = new Cell(cellX, cellY);
        }
    }
    this.startCell = null;
    this.endCell = null;
    this.clearCanvas();
};

/**
 * перерисовывает лабиринт заново
 */
Maze.prototype.refresh = function () {
    this.clearCanvas();
    this.redraw();
};

// выбор точки старта маршрута
Maze.prototype.pickStartPoint = function () {
    this.__startPointPick(this.setStartPoint, MODE_PICK_START_POINT);
};

// выбор точки финиша
Maze.prototype.pickEndPoint = function () {
    this.__startPointPick(this.setEndPoint, MODE_PICK_END_POINT);
};

/**********************************************************/
// управление визуальной частью лабиринта

/**
 * рисует лабиринт
 */
Maze.prototype.redraw = function () {
    this.drawBackground();
    this.draw();
};

// заполняет фон лабиринта
Maze.prototype.drawBackground = function () {
    this.canvasContext.fillStyle = this.FILL_STYLE_BACKGROUND;
    this.canvasContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
};

// очищает изображение
Maze.prototype.clearCanvas = function () {
    this.canvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
};

// отрисовывет ячейки лабиринта
Maze.prototype.draw = function () {
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            this.drawBlock(cellX, cellY, this.cells[cellX][cellY]);
        }
    }
    this.__drawStartAndFinish();
};

/**
 * Метод рисует точки старта и финиша, следует вызывать его последним, чтобы старт и финиш рисовались поверх всего
 * @private
 */
Maze.prototype.__drawStartAndFinish = function () {
    var cellWidth = this.canvasWidth / this.cellsX;
    var cellHeight = this.canvasHeight / this.cellsY;
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            var cell = this.cells[cellX][cellY];
            if (cell.isSelected()) {
                var img = null;
                if (this.startCell && this.startCell.X == cellX && this.startCell.Y == cellY) {
                    img = this.startFlagImage;
                } else if (this.endCell && this.endCell.X == cellX && this.endCell.Y == cellY) {
                    img = this.finishFlagImage;
                }
                // bottom center
//                this.canvasContext.drawImage(img, cellWidth * cellX + cellWidth / 2 - img.width / 2, cellHeight * cellY + cellHeight / 2 - img.height);
                // mid center, fixed size
                this.canvasContext.drawImage(img, cellWidth * cellX, cellHeight * cellY, cellWidth, cellHeight);
            }
        }
    }
};

// рисует один сегмент маршрута между соседними ячейками
Maze.prototype.drawRouteLine = function (cellFrom, cellTo) {
    this.canvasContext.lineCap = 'round';
    this.canvasContext.lineWidth = 6;
    this.canvasContext.strokeStyle = "#2244cc";
    this.canvasContext.beginPath();

    var xFrom = cellFrom.X * this.cellWidth + this.cellWidth / 2;
    var yFrom = cellFrom.Y * this.cellHeight + this.cellHeight / 2;
    var xTo = cellTo.X * this.cellWidth + this.cellWidth / 2;
    var yTo = cellTo.Y * this.cellHeight + this.cellHeight / 2;
    this.canvasContext.moveTo(xFrom, yFrom);
    this.canvasContext.lineTo(xTo, yTo);
    this.canvasContext.stroke();
};

// рисует одну ячейку лабиринта
Maze.prototype.drawBlock = function (cellX, cellY, cell) {
    var fillStyle = null;
    var blockType = cell.getType();
    switch (blockType) {
        case Cell.TYPE_WALL:
            fillStyle = this.FILL_STYLE_BLOCK_CELL;
            break;
        default:
            fillStyle = this.FILL_STYLE_EMPTY_CELL;
            break;
    }
    this.canvasContext.fillStyle = fillStyle;
    this.canvasContext.fillRect(
        this.cellWidth * cellX,
        this.cellHeight * cellY,
        this.cellWidth * (cellX + 1),
        this.cellHeight * (cellY + 1));
};
/***********************************************************/
// управление состоянием объекта

/**
 * генерирует значение в ячейках лабиринта
 */
Maze.prototype.generateCells = function () {
    // заполняем весь лабиринт стеной
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            this.cells[cellX][cellY].setType(Cell.TYPE_WALL);
        }
    }
    // выбираем начальные точки для рисования туннелей
    var arStartCells = [];
    for (var i = 0; i < 30; i++) {
        var startCell = [Math.round(Math.random() * this.cellsX), Math.round(Math.random() * this.cellsY)];
        arStartCells.push(startCell);
    }
    // передаем начальный лабиринт в функцию создания туннелей лабиринта
    this.generateCellsRecursive(arStartCells);
};

// рекурсивная функция, рисует туннели в лабиринте анимированно
Maze.prototype.generateCellsRecursive = function (arGrowingCells) {
    // for each cell
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
                if (this.cells[sideCell[0]] &&
                    this.cells[sideCell[0]][sideCell[1]] &&
                    this.cells[sideCell[0]][sideCell[1]].type != Cell.TYPE_EMPTY) {
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
                        if (this.cells[arTmpSideCells[j][0][0]] &&
                            this.cells[arTmpSideCells[j][0][0]][arTmpSideCells[j][0][1]] &&
                            this.cells[arTmpSideCells[j][0][0]][arTmpSideCells[j][0][1]].type == Cell.TYPE_EMPTY &&
                            this.cells[arTmpSideCells[j][1][0]] &&
                            this.cells[arTmpSideCells[j][1][0]][arTmpSideCells[j][1][1]] &&
                            this.cells[arTmpSideCells[j][1][0]][arTmpSideCells[j][1][1]].type == Cell.TYPE_EMPTY) {
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
            this.cells[sideCell[0]][sideCell[1]].type = Cell.TYPE_EMPTY;
        }
        // if current cell has no more place to move, than delete it from growing cells
        var bNoAvailableMove = true;
        for (var j in arSideCells) {
            if (this.cells[currentCell[0] + arSideCells[j][0]] &&
                this.cells[currentCell[0] + arSideCells[j][0]][currentCell[0] + arSideCells[j][1]] &&
                this.cells[currentCell[0] + arSideCells[j][0]][currentCell[0] + arSideCells[j][1]].type != Cell.TYPE_EMPTY) {
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
            this.generateCellsRecursive(arGrowingCellsNew);
            this.refresh();
        };
        requestAnimFrame(generateFunction.bind(this));
    }
};

/**********************************************************************************/
// выбор начальной и конечной точки лабиринта

// записывает начальную точку маршрута
Maze.prototype.setStartPoint = function (cellX, cellY) {
    if (this.startCell) {
        this.startCell.setSelected(false);
    }
    this.startCell = this.cells[cellX][cellY];
    this.startCell.setSelected(true);
    this.refresh();
    this.__setMode(MODE_DEFAULT);
};

// записывает конечную точку
Maze.prototype.setEndPoint = function (cellX, cellY) {
    if (this.endCell) {
        this.endCell.setSelected(false);
    }
    this.endCell = this.cells[cellX][cellY];
    this.endCell.setSelected(true);
    this.refresh();
    this.__setMode(MODE_DEFAULT);
};

// активирует выбор точки маршрута
Maze.prototype.__startPointPick = function (clickHandler, mode) {
    this.funPointPickHandler = clickHandler;
    var _this = this;
    this.pointPickListener = function (event) {
        _this.mouseClickListener(event, _this);
    };
    if (this.canvas.addEventListener) {
        this.canvas.addEventListener('click', this.pointPickListener);
    } else {
        this.canvas.attachEvent('onclick', this.pointPickListener);
    }
    this.__setMode(mode);
};

// деактивирует выбор точки маршрута
Maze.prototype.__endPointPick = function () {
    this.canvas.removeEventListener("click", this.pointPickListener);
    this.pointPickListener = null;
};

// функция отслеживает нажатия мышкой на лабиринте (нужно для установки начальной и конечной точки)
Maze.prototype.mouseClickListener = function (event, _this) {
    event = event || window.event;
    var rect = _this.canvas.getBoundingClientRect();
    var x = event.clientX - rect.left - 1;
    var y = event.clientY - rect.top - 1;
    var cellWidth = _this.canvasWidth / _this.cellsX;
    var cellHeight = _this.canvasHeight / _this.cellsY;
    var cellX = (x - x % cellWidth) / cellWidth;
    var cellY = (y - y % cellHeight) / cellHeight;
    if (_this.funPointPickHandler) {
        _this.funPointPickHandler(cellX, cellY);
        _this.funPointPickHandler = null;
    }
    _this.__endPointPick();
};
/********************************************************************************************/
Maze.prototype.setCellType = function (cellX, cellY, type) {
    // TODO: set type of cell to specified type
};


/********************************************************************************************/

Maze.prototype.__setMode = function (mode) {
    this.mode = mode;
    this.__invokeModeChangeListener(mode);
};

Maze.prototype.setStatusChangeListener = function (funStatusChangeListener) {
    this.statusChangeListener = funStatusChangeListener;
};

Maze.prototype.setModeChangeListener = function (funModeChangeListener) {
    this.modeChangeListener = funModeChangeListener;
};

Maze.prototype.__invokeStatusChangeListener = function (statusMessage) {
    if (this.statusChangeListener) {
        this.statusChangeListener(statusMessage);
    }
};

Maze.prototype.__invokeModeChangeListener = function (modeName) {
    if (this.modeChangeListener) {
        this.modeChangeListener(modeName);
    }
};

Maze.prototype.solve = function () {
    try {
        this.solver = new Solver(this.cells, this.startCell, this.endCell);
        var requestHandler = this.__requestHandler.bind(this);
        this.solver.addResponseListener(requestHandler);
        this.solver.nextStep();
    } catch (e) {
        alert(e.message);
    }
};

Maze.prototype.__requestHandler = function (oResponse) {
    var status;
    try {
        var action = oResponse.action;
        if (!action) alert("server returned response with no action specified");
        switch (action) {
            case "no_action":
                alert("No action to handle");
                break;
            case "get_step":
                // drows new step from route
                if (oResponse.result == "has_next_step") {
                    this.__addStep(oResponse.step_start, oResponse.step_end);
                    this.solver.nextStep();
                }
                break;
            default:

                break;
        }
        status = "Action " + action + ": ";
        status += oResponse.error ? oResponse.error : oResponse.message;
    } catch (e) {
        status = e.message;
    }
    this.__invokeStatusChangeListener(status);
};

Maze.prototype.__addStep = function (stepStart, stepEnd) {
    this.drawRouteLine(stepStart, stepEnd);
    this.__drawStartAndFinish();
};

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