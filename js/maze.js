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
    this.startCell = null;
    this.endCell = null;
    this.FILL_STYLE_EMPTY_CELL = "#FFFF55";
    this.FILL_STYLE_BLOCK_CELL = "#44CCFF";
    this.FILL_STYLE_BACKGROUND = "#000000";
    this.FILL_STYLE_SELECTED_CELL = "#FF9999";
    this.FILL_STYLE_START_CELL = "#A0F";
    this.FILL_STYLE_FINISH_CELL = "#FF2222";

    this.funPointPickHandler = null;
    this.pointPickListener = null;
    this.route = '';
    this.animRoute = [];
    this.animRouteFrameBuffer = [];

    this.statusChangeListener = null;

    this.generate();
}

/**
 * функция создания случайного лабиринта
 */
Maze.prototype.generate = function () {
    this.clear();
    this.generateCells();
    this.redraw();
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
    this.clearRoute();
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
    this.__startPointPick(this.setStartPoint);
};

// выбор точки финиша
Maze.prototype.pickEndPoint = function () {
    this.__startPointPick(this.setEndPoint);
};

/**********************************************************/
// управление визуальной частью лабиринта

/**
 * рисует лабиринт
 */
Maze.prototype.redraw = function () {
    this.drawBackground();
    this.draw();
    this.drawRoute();
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
        if (this.startCell && this.startCell.X == cellX && this.startCell.Y == cellY) {
            fillStyle = this.FILL_STYLE_START_CELL;
        } else if (this.endCell && this.endCell.X == cellX && this.endCell.Y == cellY) {
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

/**
 * анимированно рисует маршрут
 */
Maze.prototype.drawRouteAnimated = function () {
    if (this.route && this.route.length > 0) {
        this.animRouteFrameBuffer = this.route;
        this.animate();
    }

};

/**
 * рекурсивная функция, рисует маршрут по сегментам последовательно
 */
Maze.prototype.animate = function () {
    // update
    this.animRoute.push(this.animRouteFrameBuffer.splice(0, 1)[0]);
    // clear

    // draw stuff
    this.drawRoute();
    // request new frame
    if (this.animRouteFrameBuffer.length > 0) {
        requestAnimFrame(function () {
            maze.animate();
        });
    }
};

/***********************************************************/
// управление состоянием объекта

/**
 * очищает маршрут
 */
Maze.prototype.clearRoute = function () {
    this.route = "";
    this.animRoute = [];
    this.animRouteFrameBuffer = [];
};

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
    this.clearRoute();
    this.refresh();
};

// записывает конечную точку
Maze.prototype.setEndPoint = function (cellX, cellY) {
    if (this.endCell) {
        this.endCell.setSelected(false);
    }
    this.endCell = this.cells[cellX][cellY];
    this.endCell.setSelected(true);
    this.clearRoute();
    this.refresh();
};

// активирует выбор точки маршрута
Maze.prototype.__startPointPick = function (clickHandler) {
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

// запись маршрута во внутреннее состояние
Maze.prototype.setRoute = function (oRoute) {
    this.route = oRoute;
};

Maze.prototype.getRoute = function() {
    return this.route;
};

/********************************************************************************************/
// управление решением по клиент-серверному принципу

Maze.prototype.setStatusChangeListener = function(funStatusChangeListener) {
    this.statusChangeListener = funStatusChangeListener;
};

Maze.prototype.__invokeStatusChangeListener = function(statusMessage) {
    if(this.statusChangeListener) {
        this.statusChangeListener(statusMessage);
    }
};

Maze.prototype.solve = function() {
    this.startSolve();
    this.makeStep();
};

/**
 * инициализация эвристического алгоритма
 */
Maze.prototype.startSolve = function () {
    var funHandler = this.requestHandler.bind(this);
    request({
        "action": "set_info",
        "maze": this.cells,
        "startCell": this.startCell,
        "endCell": this.endCell
    }, funHandler);
};

Maze.prototype.makeStep = function() {
    var funHandler = this.requestHandler.bind(this);
    request({
        "action": "get_step"
    }, funHandler);
};

Maze.prototype.requestHandler = function (action, oResponse) {
    switch (action) {
        case "no_action":
            alert("No action to handle");
            break;
    }
    var status = "Action " + action + ": ";
    status += oResponse.error ? oResponse.error : oResponse.message;
    this.__invokeStatusChangeListener(status);
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

// получает объект xmlHttpRequest в зависимости от браузера
function getXmlHttp() {
    var xmlhttp;
    try {
        xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (E) {
            xmlhttp = false;
        }
    }
    if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
        xmlhttp = new XMLHttpRequest();
    }
    return xmlhttp;
}

function request(oRequestParams, funResponseHandler) {
    var action = oRequestParams.action || "no_action";

    /** @type XMLHttpRequest */
    var req = getXmlHttp();

    var sRequest = "json=" + JSON.stringify(oRequestParams);
    var oResponse = {};
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status == 200) {
                try {
                    oResponse = JSON.parse(req.responseText);
                } catch(e) {
                    oResponse = {message: strip_tags(req.responseText)};
                }
            }
            oResponse.status = req.status;
            funResponseHandler(action, oResponse);
        }

    };
    req.open('POST', '/solver_hevristic.php', true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("Content-length", sRequest.length);
    req.setRequestHeader("Connection", "close");

    try {
        req.send(sRequest);
    } catch (e) {
        oResponse.error = "Не удалось отправить запрос на сервер (" + e.message + ")";
        funResponseHandler(action, oResponse);
    }
}

function strip_tags (input, allowed) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Luke Godfrey
    // +      input by: Pul
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +      input by: Alex
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Marc Palau
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Eric Nagel
    // +      input by: Bobby Drake
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Tomasz Wesolowski
    // +      input by: Evertjan Garretsen
    // +    revised by: Rafał Kukawski (http://blog.kukawski.pl/)
    // *     example 1: strip_tags('<p>Kevin</p> <br /><b>van</b> <i>Zonneveld</i>', '<i><b>');
    // *     returns 1: 'Kevin <b>van</b> <i>Zonneveld</i>'
    // *     example 2: strip_tags('<p>Kevin <img src="someimage.png" onmouseover="someFunction()">van <i>Zonneveld</i></p>', '<p>');
    // *     returns 2: '<p>Kevin van Zonneveld</p>'
    // *     example 3: strip_tags("<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>", "<a>");
    // *     returns 3: '<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>'
    // *     example 4: strip_tags('1 < 5 5 > 1');
    // *     returns 4: '1 < 5 5 > 1'
    // *     example 5: strip_tags('1 <br/> 1');
    // *     returns 5: '1  1'
    // *     example 6: strip_tags('1 <br/> 1', '<br>');
    // *     returns 6: '1  1'
    // *     example 7: strip_tags('1 <br/> 1', '<br><br/>');
    // *     returns 7: '1 <br/> 1'
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}