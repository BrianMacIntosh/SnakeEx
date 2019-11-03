# SnakeEx
SnakeEx is a 2D text-search or pattern-matching language based on regex. SnakeEx was developed for a contest on the [Code Golf Stack Exchange](http://codegolf.stackexchange.com/questions/47311/language-design-2-d-pattern-matching).

This source code is a web-based interpreter for the language. Try it out [here](http://brianmacintosh.com/snakeex/index.html).

## Overview
A SnakeEx program consists of a set of definitions for snakes. Each snake is defined by a sequence of commands similar to a regular expression, but including some additional ones for changing directions and spawning new snakes. This enables a SnakeEx program to recognize patterns in 2-dimensional blocks of text.

A snake definition has the format `name:commands` or `name{params}:commands`. Each snake definition occurs on its own line. The program always starts with a single snake using the first definition, moving right.

## Strings
When a SnakeEx program contains a sequence of text characters, the snake will attempt to read those characters in order, advancing in its current direction after each read (much like regex). If it ever encounters a character that does not match, that snake will fail.

A range of characters can be specified as a shortcut: `0-9`. This example would be replaced with '0123456789' at compile time. When used with OR semantics (see below), this construct can create regex-like character classes.

Backslashes are used as an escape character to turn special characters into normal text. Special characters that need to be escaped are:

`` `:+*?~%<>()[]{}!.$-^\ ``

## Calls and Params
A snake can spawn additional snakes via calls. All snakes must succeed for the program to consider some text a match. A call has the format `{name<dir>params}`, which creates a new snake at the position of the current snake, pointed in the direction specified by `dir`, with some other properties defined by single-character parameters. Parameters can be defined either by the call or by the declaration being called. Snakes inherit all the parameters of their parent.

### Param	Significance
| | |
|-|-|
| `P` |	Piggyback. The current snake will be moved to the final location and orientation of the spawned snake. |
| `H`	| Horizontal wrap. If the snake leaves the input on the x-axis, it will wrap around to the other side. |
| `V`	| Vertical wrap. |
| `W`	| Wrap all. Equivalent to `HV`. |
| `E`	| Exclusive. This snake will not match any character that has been marked by the program. |
| `I`	| Case insensitive. |
| `A`	| Advance. Advances the calling thread, like `.!` (suitable for spawners). |
| `S`	| Silent. This snake won't mark characters it matches, like `~`. |
| `L`	| Loop. Characters can only be matched by this snake if they have already been marked, like `` ` ``. |

0-9	numbers put snakes in groups. All snakes in the same group must traverse the same number of characters or the program will not match.

## AND and OR
By default, any list of statements uses AND semantics - every statement must be matched, in order, for the list to match. If you surround a list of statements with square brackets `[]`, those statements will use OR semantics instead - if any one of the statements matches, the list matches. This is very similar to how character classes work in regex.

A statement list containing only strings can be negated by prefixing its contents with a caret `^` (e.g. `^statements`). Note that this is invalid if the list contains any other element like a direction change or a call.

## Closures
Like in regex, closures can be appended to tokens in the command list to repeat them a certain number of times. This branches the program - if any possible sequence of actions defined by the closure succeeds, the match succeeds. Parenthesis can be used to form groups to which closures can be applied. SnakeEx recognizes the following closures:

### Closure	Significance

|     | |
|-----|-|
| `?`	| Match the token 0 or 1 times. |
| `*`	| Match the token 0 or more times. |
| `+`	| Match the token 1 or more times. |
| `%(num)`	| Match the token num times. |
| `%{min,max}`	| Match the token anywhere from min to max times (inclusive). |

## Other Operators
The `!` operator is a logical not. It will fail the match if the statement that follows it matches anything (see the Minecraft Chests example).

The `~` operator indicates that following should be checked, but should not be marked as part of the solution to the problem (see the Nether Portal example).

The `` ` `` operator indicates that the following should only be matched if it is already marked. This overrides the exclusive flag.

## Directions
All directions except `.` are relative to the current snake. Directions are used to specify the starting direction of a call, and you can also have a snake change direction mid-regex with the syntax `<dir>`.

| Code |	Significance |
| -----|-------------- |
| `R`	 | Turn right. |
| `L`	 | Turn left. |
| `F`	 | Forward - does not change the direction. |
| `B`	 | Backward - reverse direction. |
| `+`	 | Orthogonal branch. This branches the snake in all four directions orthogonal to its current direction of travel. A match is found if any of the branches succeeeds. |
| `X`	 | Diagonal branch. Same as '+' but on the diagonals and not the orthogonals. |
| `*`	 | Cardinal branch. Same as '+' but including the cardinal diagonals. |
| `T`	 | "Turn" branch. Branches the snake left and right. |
| `P`	 | "Proceed" branch. Branches the snake forward, left, and right. |
| `.`	 | Absolute reset. Points the snake right absolutely. |
| `!`	 | Branches to every point on the board. |

An empty direction command (`<>`) is interpreted as `<F>`.
