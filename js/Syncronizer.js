/**
 * Created by Jack on 17.11.13.
 */

function Syncronizer() {
    this.asyncInProcess = false;
    this.attemptsCount = 0;
}

Syncronizer.prototype.run = function(context, func, args, isRecursive) {
    if(!isRecursive) this.attemptsCount = 0;
    if (this.asyncInProcess == true && this.attemptsCount < 10) {
        this.attemptsCount++;
        var startAsync = this.run.bind(this);
        setTimeout(function() {startAsync(context, func, args, true)}, 50 + this.attemptsCount * 2);
    } else {
        if(this.attemptsCount < 20) {
            this.asyncInProcess = true;
            var _func = func.bind(context);
            _func(args);
        } else {
            throw {message: "can't start function " + func.toString()};
        }
    }
};

Syncronizer.prototype.end = function() {
    this.asyncInProcess = false;
};