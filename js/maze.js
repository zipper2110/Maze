// функция для совершения действия с задержкой (для анимированного рисования)
window.requestAnimFrame = (function (callback) {
    return function (callback) {
            window.setTimeout(callback, 40);
        };
})();

/*
Функция "Maze" создает javascript-прототип (или, иначе говоря, класс) объекта лабиринта. Этому прототипу назначаются
свои функции (иначе говоря, методы класса).
 */

// функция-конструктор объекта лабиринта
function Maze(canvasObject, cellsX, cellsY) {
    /** @type {HTMLElement} */
    this.canvas = canvasObject;
    this.canvasContext = this.canvas.getContext("2d");
    this.cellsX = cellsX;
    this.cellsY = cellsY;
    this.canvasWidth = canvasObject.width;
    this.canvasHeight = canvasObject.height;

    /** @type {Array<Array<Cell>>} */
    this.cells = [];
    this.startCell = [];
    this.endCell = [];
    this.FILL_STYLE_EMPTY_CELL = "#FFFF55";
    this.FILL_STYLE_BLOCK_CELL = "#44CCFF";

    this.FILL_STYLE_BACKGROUND = "#000000";

    this.FILL_STYLE_SELECTED_CELL = "#FF9999";

    this.FILL_STYLE_FINISH_CELL = "#FF2222";
    this.FILL_STYLE_START_CELL = "#A0F";

    this.funPointPickHandler = null;
    this.pointPickListener = null;
    this.route = '';
    this.animRoute = [];
    this.animRouteFrameBuffer = [];

    this.generate();
}

// анимированно рисует маршрут
Maze.prototype.drawRouteAnimated = function () {
    if (this.route && this.route.length > 0) {
        this.animRouteFrameBuffer = this.route;
        this.animate();
    }

};

// рекурсивная функция, рисует маршрут по сегментам последовательно
Maze.prototype.animate = function () {
    // update
    this.animRoute.push(this.animRouteFrameBuffer.splice(0, 1)[0]);
    // clear

    // draw stuff
    this.refresh();
    // request new frame
    if (this.animRouteFrameBuffer.length > 0) {
        requestAnimFrame(function () {
            maze.animate();
        });
    }
};

// функция создания случайного лабиринта
Maze.prototype.generate = function () {
    this.clear();
    this.generateCells();
    this.redraw();
};

// перерисовывает лабиринт заново
Maze.prototype.refresh = function () {
    this.clearCanvas();
    this.redraw();
};

// стирает лабиринт с экрана
Maze.prototype.clear = function () {
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            if (!this.cells[cellX]) this.cells[cellX] = [];
            this.cells[cellX][cellY] = new Cell();
        }
    }
    this.clearRoute();
    this.clearCanvas();
};

// очищает маршрут
Maze.prototype.clearRoute = function () {
    this.route = "";
    this.animRoute = [];
    this.animRouteFrameBuffer = [];
};

// рисует лабиринт
Maze.prototype.redraw = function () {
    this.drawBackground();
    this.draw();
    this.drawRoute();
};

// генерирует значение в ячейках лабиринта
Maze.prototype.generateCells = function () {
    // заполняем весь лабиринт стеной
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            this.cells[cellX][cellY].setType(Cell.TYPE_WALL);
        }
    }
    // выбираем начальные точки для рисования туннелей
    var arStartCells = [];
    for(var i = 0; i < 30; i++) {
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
            if(Math.random() > 0.005) {
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

// отрисовывет ячейки лабиринта
Maze.prototype.draw = function () {
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            this.drawBlock(cellX, cellY, this.cells[cellX][cellY]);
        }
    }
};

// рисует маршрут без анимации
Maze.prototype.drawRoute = function () {
    if (this.animRoute && this.animRoute.length > 0) {
        this.canvasContext.lineJoin = 'round';
        this.canvasContext.lineWidth = 2;
        this.canvasContext.strokeStyle = "#FF0000";
        this.canvasContext.beginPath();
        var _this = this;
        for (var i in this.animRoute) {
            if (i < this.animRoute.length - 1) {
                var cellFrom = this.animRoute[i];
                var cellTo = this.animRoute[parseInt(i) + 1];
                this.drawRouteLine([cellFrom[0], cellFrom[1]], [cellTo[0], cellTo[1]]);
            }
        }
        this.canvasContext.stroke();
    }
};

// рисует один сегмент маршрута между соседними ячейками
Maze.prototype.drawRouteLine = function (cellFrom, cellTo) {
    var cellWidth = this.canvasWidth / this.cellsX;
    var cellHeight = this.canvasHeight / this.cellsY;
    var xFrom = cellFrom[0] * cellWidth + cellWidth / 2;
    var yFrom = cellFrom[1] * cellHeight + cellHeight / 2;
    var xTo = cellTo[0] * cellWidth + cellWidth / 2;
    var yTo = cellTo[1] * cellHeight + cellHeight / 2;
    this.canvasContext.moveTo(xFrom, yFrom);
    this.canvasContext.lineTo(xTo, yTo);
    this.canvasContext.stroke();
};

// рисует одну ячейку лабиринта
Maze.prototype.drawBlock = function (cellX, cellY, cell) {
    var cellWidth = this.canvasWidth / this.cellsX;
    var cellHeight = this.canvasHeight / this.cellsY;
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
    this.canvasContext.fillRect(cellWidth * cellX, cellHeight * cellY, cellWidth * (cellX + 1), cellHeight * (cellY + 1));
    if (cell.isSelected()) {
        if (this.startCell && this.startCell.length > 0 && this.startCell[0] == cellX && this.startCell[1] == cellY) {
            fillStyle = this.FILL_STYLE_START_CELL;
        } else if (this.endCell && this.endCell.length > 0 && this.endCell[0] == cellX && this.endCell[1] == cellY) {
            fillStyle = this.FILL_STYLE_FINISH_CELL;
        } else {
            fillStyle = this.FILL_STYLE_SELECTED_CELL;
        }
        this.canvasContext.fillStyle = fillStyle;
        this.canvasContext.beginPath();
        this.canvasContext.strokeStyle = "rgba(0, 0, 0, 0)";
        this.canvasContext.arc(cellWidth * cellX + cellWidth / 2, cellHeight * cellY + cellHeight / 2, Math.min(cellWidth, cellHeight) / 2, 0, 2 * Math.PI, false);
        this.canvasContext.fill();
        this.canvasContext.stroke();
    }
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

// записывает начальную точку маршрута
Maze.prototype.setStartPoint = function (cellX, cellY) {
    if (this.startCell && this.startCell.length > 0) {
        this.cells[this.startCell[0]][this.startCell[1]].setSelected(false);
    }
    this.startCell = [cellX, cellY];
    this.cells[cellX][cellY].setSelected(true);
    this.clearRoute();
    this.refresh();
};

// записывает конечную точку
Maze.prototype.setEndPoint = function (cellX, cellY) {
    if (this.endCell && this.endCell.length > 0) {
        this.cells[this.endCell[0]][this.endCell[1]].setSelected(false);
    }
    this.endCell = [cellX, cellY];
    this.cells[cellX][cellY].setSelected(true);
    this.clearRoute();
    this.refresh();
};

// активирует выбор точки маршрута
Maze.prototype.__startPointPick = function (clickHandler) {
    this.funPointPickHandler = clickHandler;
    var _this = this;
    this.pointPickListener = function(event) {
        _this.mouseClickListener(event, _this);
    };
    if (this.canvas.addEventListener) {
        this.canvas.addEventListener('click', this.pointPickListener);
    } else {
        this.canvas.attachEvent('onclick', this.pointPickListener);
    }
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

// выбор точки старта маршрута
Maze.prototype.pickStartPoint = function () {
    this.__startPointPick(this.setStartPoint);
};

// выбор точки финиша
Maze.prototype.pickEndPoint = function () {
    this.__startPointPick(this.setEndPoint);
};

// преобразует текущее состояние лабиринта в строку для передачи на сервер
Maze.prototype.getInfoToString = function () {
    var sMazeInfo = "";
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            sMazeInfo += this.cells[cellX][cellY].getType();
            if (cellY != this.cellsY - 1) {
                sMazeInfo += ",";
            }
        }
        if (cellX != this.cellsX - 1) {
            sMazeInfo += ";";
        }
    }
    return sMazeInfo;
};

// преобразует точку старта в строку для передачи на сервер
Maze.prototype.getMazeStartToString = function () {
    if (this.startCell && this.startCell.length > 0) {
        return this.startCell.join(",");
    } else {
        return "";
    }
};

// преобразует точку финиша в строку для передачи на сервер
Maze.prototype.getMazeFinishToString = function () {
    if (this.endCell && this.endCell.length > 0) {
        return this.endCell.join(",");
    } else {
        return "";
    }
};

// запись маршрута во внутреннее состояние
Maze.prototype.setRoute = function (oRoute) {
    this.route = oRoute;
};

// класс ячейки лабиринта, нужен для упрощения работы с ячейками
// содержит информацию о типе ячейки (стена или проходимая ячейка) и о том, выбрана ячейка или нет
function Cell(type) {
    if (!type) type = 0;
    this.bSelected = false;
    this.type = type;
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
