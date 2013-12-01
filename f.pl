calculate_f(X, Y, Length, Finish_X, Finish_Y):-
    Dist is abs(Finish_X - X) + abs(Finish_Y - Y),
    F is 2 * Dist + Length,
    write(F).