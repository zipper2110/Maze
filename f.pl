calculate_f(X, Y, Length, Finish_X, Finish_Y):-
    Dist is abs(Finish_X - X) + abs(Finish_Y - Y),
    F is Dist + Length,
    write(F).