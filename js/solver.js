/**
 * Created with JetBrains PhpStorm.
 * User: Captain Jack
 * Date: 24.10.13
 * Time: 21:37
 */

function Solver(maze, startCell, endCell) {
    this.maze = maze;
    this.startCell = startCell;
    this.endCell = endCell;
    this.arResponseListeners = [];

    this.syncronizer = new Syncronizer();

    this.syncronizer.run(this, this.__sendInfo);
}

Solver.prototype.addResponseListener = function(funListener) {
    this.arResponseListeners.push(funListener);
};

Solver.prototype.__invokeResponseListeners = function(oResponse) {
    for(var index in this.arResponseListeners) {
        this.arResponseListeners[index](oResponse);
    }
};

Solver.prototype.__sendInfo = function() {
    var funEndAsync = this.__endAsync.bind(this);
    request({
        "action": "set_info",
        "maze": this.maze,
        "startCell": this.startCell,
        "endCell": this.endCell
    },
        funEndAsync
    );
    return true;
};

Solver.prototype.nextStep = function() {
    this.syncronizer.run(this, this.__nextStep);
};

Solver.prototype.__nextStep = function() {
    var funEndAsync = this.__endAsync.bind(this);
    request({
        "action": "get_step"
    },
        funEndAsync
    );
};

Solver.prototype.__endAsync = function(action, oResponse) {
    this.syncronizer.end();
    this.__invokeResponseListeners(oResponse);
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
    req.open('POST', '/solver_interface.php', true);
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
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}