// функция для совершения действия с задержкой (для анимированного рисования)
window.requestAnimFrame = (function (callback) {
    return function (callback) {
        window.setTimeout(callback, 40);
    };
})();

var MODE_DEFAULT = "обычный";
var MODE_PICK_START_POINT = "выбор начальной точки";
var MODE_PICK_END_POINT = "выбор конечной точки";
var MODE_DRAW_WALL = "рисование стены";
var MODE_DRAW_PATH = "рисование прохода";

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
    /** @type {Cell} */
    this.startCell = null;
    /** @type {Cell} */
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
    this.startCell = null;
    this.endCell = null;
};

Maze.prototype.generateCells = function() {
    var funGenerationStepListener = this.redraw.bind(this);
    this.cells = __generateMaze(this.cellsX, this.cellsY, funGenerationStepListener);
}

/**
 * перерисовывает лабиринт заново
 */
Maze.prototype.refresh = function () {
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
    this.draw();
};

// отрисовывет ячейки лабиринта
Maze.prototype.draw = function () {
    for (var cellX = 0; cellX < this.cellsX; cellX++) {
        for (var cellY = 0; cellY < this.cellsY; cellY++) {
            this.drawBlock(this.cells[cellX][cellY]);
        }
    }
    this.__drawStartAndFinish();
};

// рисует одну ячейку лабиринта
Maze.prototype.drawBlock = function (cell) {
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
        this.cellWidth * cell.X,
        this.cellHeight * cell.Y,
        this.cellWidth * (cell.X + 1),
        this.cellHeight * (cell.Y + 1));
};

/**
 * Метод рисует точки старта и финиша, следует вызывать его последним, чтобы старт и финиш рисовались поверх всего
 * @private
 */
Maze.prototype.__drawStartAndFinish = function () {
    if(this.startCell) {
        this.canvasContext.drawImage(this.startFlagImage, this.cellWidth * this.startCell.X, this.cellHeight * this.startCell.Y, this.cellWidth, this.cellHeight);
    }
    if(this.endCell) {
        this.canvasContext.drawImage(this.finishFlagImage, this.cellWidth * this.endCell.X, this.cellHeight * this.endCell.Y, this.cellWidth, this.cellHeight);
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
/***********************************************************/
// управление состоянием объекта


/**********************************************************************************/
// выбор начальной и конечной точки лабиринта

// записывает начальную точку маршрута
Maze.prototype.setStartPoint = function (cellX, cellY) {
    if (this.startCell) {
        this.startCell.setSelected(false);
    }
    this.startCell = this.cells[cellX][cellY];
    this.startCell.setSelected(true);
};

// записывает конечную точку
Maze.prototype.setEndPoint = function (cellX, cellY) {
    if (this.endCell) {
        this.endCell.setSelected(false);
    }
    this.endCell = this.cells[cellX][cellY];
    this.endCell.setSelected(true);
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
    this.refresh();
    this.__setMode(MODE_DEFAULT);
};

// функция отслеживает нажатия мышкой на лабиринте (нужно для установки начальной и конечной точки)
Maze.prototype.mouseClickListener = function (event, _this) {
    event = event || window.event;
    var rect = _this.canvas.getBoundingClientRect();
    var x = event.clientX - rect.left - 1;
    var y = event.clientY - rect.top - 1;
    var cellX = (x - x % _this.cellWidth) / _this.cellWidth;
    var cellY = (y - y % _this.cellHeight) / _this.cellHeight;
    if (_this.funPointPickHandler) {
        _this.funPointPickHandler(cellX, cellY);
        _this.funPointPickHandler = null;
    }
    _this.__endPointPick();
};
/********************************************************************************************/

Maze.prototype.__setMode = function (mode) {
    this.mode = mode;
    this.__invokeModeChangeListener(mode);
};

Maze.prototype.setStatusChangeListener = function (funStatusChangeListener) {
    this.statusChangeListener = funStatusChangeListener;
};

Maze.prototype.__invokeStatusChangeListener = function (statusMessage) {
    if (this.statusChangeListener) {
        this.statusChangeListener(statusMessage);
    }
};

Maze.prototype.setModeChangeListener = function (funModeChangeListener) {
    this.modeChangeListener = funModeChangeListener;
};

Maze.prototype.__invokeModeChangeListener = function (modeName) {
    if (this.modeChangeListener) {
        this.modeChangeListener(modeName);
    }
};

Maze.prototype.solve = function () {
    try {
        this.refresh();
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
            case "get_step":
                // drows new step from route
                if (oResponse.result == 1) {
                    this.__addStep(oResponse.step_start, oResponse.step_end);
                    this.solver.nextStep();
                    oResponse.message = "step from [" + oResponse.step_start.X + ";" + oResponse.step_start.Y +
                        "] to [" + oResponse.step_end.X + ";" + oResponse.step_end.Y + "]";
                } else if(oResponse.result == 2) {
                    oResponse.message = "Finish reached.";
                }
                break;
        }
        status = "Action " + action + ": ";
        status += oResponse.error ? oResponse.error : oResponse.message;
    } catch (e) {
//        status = e.message;
        status = "Unexpected error";
        console.writeln(e.message);
    }
    this.__invokeStatusChangeListener(status);
};

Maze.prototype.__addStep = function (stepStart, stepEnd) {
    this.drawRouteLine(stepStart, stepEnd);
    this.__drawStartAndFinish();
};