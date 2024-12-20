/*
SnakeEx
2D Text Pattern-matching language by Brian MacIntosh
www.brianmacintosh.com - brianamacintosh@gmail.com

Designed For:
https://codegolf.stackexchange.com/questions/47311/language-design-2-d-pattern-matching

Online Interpreter Interface/Sample Code:
https://www.brianmacintosh.com/snakeex

Full Language Spec:
https://www.brianmacintosh.com/snakeex/spec.html

This source code is the full interpreter, capable of taking code and input text
and producing matches.

Usage:

1. Call snakeEx.run, which takes two string parameters - the code to run, and
   the input to provide.  (If necessary, you can call the three stages of the
   interpreter seperately: scan, parse, and find.  See the body of snakeEx.run.)

2. If there are any errors, run returns false and snakeEx.errors is an array
   containing strings describing the errors.
   
   Otherwise, snakeEx.successes is an array containing the matches found.
   
   Matches are Javascript objects with the following fields:
   - 'origX': The start column for this match
   - 'origY': The start line for this match
   - 'marks': An array of integers. Each pair of integers represents the X and
     Y coordinate of a character that was matched by the program.
   - Other less useful state information about the final state of the program.

28 Mar 2015: Added '`' syntax, fixed a problem where exclusive snakes would fail
   when moving onto a marked tile even if not asked to match it.
29 Mar 2015: Treat non-breaking spaces as spaces.
4 April 2015: Add S and L parameters, fixed a problem where piggyback didn't
   reset snake flags.
8 April 2015: Made absolute direction '.' combinable, and fixed empty matches
   returning duplicates

This source code is licensed under the MIT license, which appears below.

Copyright (c)2015 Brian MacIntosh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var snakeEx =
{
	//types for tokens in the scan stage
	TOK_INVALID: 0,
	TOK_STRING: 1,
	TOK_SPECIAL: 2,
	TOK_ESCAPE: 3,
	
	//types for AST nodes in parse and run stages
	NODE_INVALID: 0,
	NODE_PROGRAM: 1,
	NODE_DECLARATION: 2,
	NODE_STRING: 3,
	NODE_CLASS: 4,
	NODE_CALL: 5,
	NODE_GROUP: 6,
	NODE_DIRECTION: 7,
	NODE_CLOSURE: 8,
	NODE_STATEMENTLIST: 9,
	NODE_OUTOFBOUNDS: 10,
	NODE_WILDCARD: 11,
	NODE_PARAMS: 12,
	NODE_CHARCLASS: 13,
	NODE_PRECEDING: 14,
	
	//ops for statementlist
	OP_AND: 0,
	OP_OR: 1,
	
	DEBUG_SCANNER: false,
	DEBUG_PARSER: false
};

Math.sign = Math.sign || function(a) { return a >= 0 ? (a === 0 ? 0 : 1) : -1; }

/// performs all three stages of interpretation using the provided code and input strings
snakeEx.run = function(code, input, stricterDupes)
{
	this.successes = [];
	this.errors = [];
	
	this.scan(code);
	if (this.errors.length > 0) return false;
	
	if (this.DEBUG_SCANNER)
	{
		var tokens = this.tokens;
		for (var i = 0; i < tokens.length; i++) console.log("(" + tokens[i].line + "," + tokens[i].col + " " + tokens[i].type + " '" + tokens[i].token + "')");
	}
	
	this.parseProgram();
	if (this.errors.length > 0) return false;
	
	if (this.DEBUG_PARSER)
	{
		console.log(this.program);
	}
	
	this.find(input, stricterDupes);
	if (this.errors.length > 0) return false;
	
	return this.successes;
}

/// scan the code into tokens
snakeEx.scan = function(code)
{
	this.errors.length = 0;
	var tokens = [];
	
	var line = 1;
	var col = 0;
	var tokenline = 1;
	var tokencol = 1;
	
	var tokenStartPos = 0;
	for (var c = 0; c < code.length; c++)
	{
		col++;
		var match = false;
		if (this.isSpecialCharacter(code.charAt(c))
			|| (c < code.length-1 && this.isSpecialCharacter(code.charAt(c+1)))
			|| c == code.length-1)
		{
			var tok = code.substr(tokenStartPos,c-tokenStartPos+1);
			var obj = {
					token:tok, type:this.TOK_INVALID,
					line:tokenline, col:tokencol }
			tokens.push(obj);
			
			//Mark token type
			if (tok=='\\')
				obj.type = this.TOK_ESCAPE;
			else if (this.isSpecialCharacter(tok))
				obj.type = this.TOK_SPECIAL;
			else
				obj.type = this.TOK_STRING;
			
			tokenline = line;
			tokencol = col+1;
			tokenStartPos = c+1;
			match = true;
		}
		if (code.charAt(c) == '\n')
		{
			line++;
			col = 0;
			if (match)
			{
				tokenline = line;
				tokencol = 1;
			}
		}
	}
	
	//Remove empty lines
	var was = false;
	for (var c = 0; c < tokens.length; c++)
	{
		if (tokens[c].token == '\n')
		{
			if (was)
				tokens.splice(c--,1);
			else
				was = true
		}
		else
			was = false;
	}
	
	//Transform backslash expressions
	var was = false;
	for (var c = 0; c < tokens.length; c++)
	{
		if (was)
		{
			if (tokens[c].type == this.TOK_SPECIAL || tokens[c].type == this.TOK_ESCAPE)
				tokens[c].type = this.TOK_STRING;
			else if (tokens[c].type == this.TOK_STRING)
			{
				if (tokens[c].token.charAt(0) == 'n')
					tokens[c].token = '\n' + tokens[c].token.substr(1);
				else if (tokens[c].token.charAt(0) == 't')
					tokens[c].token = '\t' + tokens[c].token.substr(1);
				else if (tokens[c].token.charAt(0) == 'r')
					tokens[c].token = '\r' + tokens[c].token.substr(1);
				else
					this.errors.push(this.errloc(tokens[c].line, tokens[c].col) + " Invalid escape code '" + tokens[c].token + "'.");
			}
			else
				this.errors.push(this.errloc(tokens[c].line, tokens[c].col) + " Unrecognized token '" + tokens[c].token + "'.");
			was = false;
		}
		else if (tokens[c].type == this.TOK_ESCAPE)
		{
			was = true;
			tokens.splice(c--,1);
		}
	}
	
	//Transform character ranges
	//HACK: hacky
	for (var c = 0; c < tokens.length; c++)
	{
		if (tokens[c].type == this.TOK_SPECIAL && tokens[c].token == "-")
		{
			var pre = tokens[c-1];
			var post = tokens[c+1];
			var loc = this.errloc(tokens[c].line, tokens[c].col);
			if (!pre || pre.type != this.TOK_STRING || pre.token.length == 0)
			{
				this.errors.push(loc + " range must be preceded by a string.");
				continue;
			}
			if (!post || post.type != this.TOK_STRING || pre.token.length == 0)
			{
				this.errors.push(loc + " range must be followed by a string.");
				continue;
			}
			
			//Extract range character
			var first, last;
			if (pre.token.length == 1)
			{
				first = pre.token;
				tokens.splice(c-1, 1);
				c--;
			}
			else
			{
				first = pre.token.charAt(pre.token.length-1);
				pre.token = pre.token.substr(0, pre.token.length-1);
			}
			if (post.token.length == 1)
			{
				last = post.token;
				tokens.splice(c+1, 1);
			}
			else
			{
				last = post.token.charAt(0);
				post.token = post.token.substr(1);
			}
			
			//Build range string
			var newstr = "";
			for (var d = first.charCodeAt(0); d <= last.charCodeAt(0); d++)
				newstr += String.fromCharCode(d);
			
			//Replace range token with string
			tokens[c].type = this.TOK_STRING;
			tokens[c].token = newstr;
		}
	}
	
	//Merge newly created strings
	for (var c = 0; c < tokens.length - 1; c++)
	{
		if (tokens[c].type == this.TOK_STRING && tokens[c+1].type == this.TOK_STRING)
		{
			tokens[c].token += tokens[c+1].token;
			tokens.splice(c+1,1);
			c--;
		}
	}
	
	//Ensure the program ends with a newline
	if (tokens.length == 0 || tokens[tokens.length-1].type != this.TOK_SPECIAL || tokens[tokens.length-1].token != '\n')
		tokens.push({ type: this.TOK_SPECIAL, token: '\n', line: 0, col: 0 });
	
	this.tokens = tokens;
}

snakeEx.errloc = function(ln, col) { return "(ln " + ln + ", col " + col + ")"; }

snakeEx.expectError = function(token, expect)
{
	if (token)
		var got = token.token;
	else
		var got = "end of code";
	this.errors.push(this.errloc(token.line, token.col) + " expected " + expect + ", got '" + got + "'.");
}

snakeEx.parseToken = function()
{
	var tok = this.tokens[this.currentToken++];
	if (tok)
		return tok;
	else
		return { type: this.TOK_INVALID, token: "end of code" };
}

snakeEx.peekToken = function()
{
	var tok = this.tokens[this.currentToken];
	if (tok)
		return tok;
	else
		return { type: this.TOK_INVALID, token: "end of code" };
}

snakeEx.closesStatementList = function(token)
{
	return token.type == this.TOK_SPECIAL && (token.token==')'||token.token=='}'||token.token==']'||token.token=='>'||token.token=='\n');
}
snakeEx.isClosure = function(token)
{
	return token.type == this.TOK_SPECIAL && (token.token=='*'||token.token=='?'||token.token=='+'||token.token=='%');
}

/// true if the specified string describes a direction or set of directions
snakeEx.isDirection = function(str)
{
	for (var c = 0; c < str.length; c++)
	{
		var ch = str.charAt(c);
		if (ch !== 'R' && ch !=='L' && ch != 'F' && ch != 'B' && ch != 'P' && ch != 'T' && ch != 'X')
			return false
	}
	return true;
}

/// true if the specified special character describes a direction
snakeEx.isSpecialDirection = function(str)
{
	return str == '*' || str == '+' || str == '.'|| str == '!';
}

/// parse tokens into an abstract syntax tree
snakeEx.parseProgram = function()
{
	this.errors.length = 0;
	this.currentToken = 0;
	this.program = { type: this.NODE_PROGRAM, declarations:[] };
	while (this.currentToken < this.tokens.length && this.errors.length == 0)
	{
		var declaration = this.parseDeclaration()
		this.program.declarations.push(declaration);
	}
}

snakeEx.parseDeclaration = function()
{
	if (this.DEBUG_PARSER) console.log("declaration");
	
	var declaration = { type: this.NODE_DECLARATION };
	var label = this.parseToken();
	if (label.type == this.TOK_STRING)
	{
		declaration.name = label.token;
		var lookat = this.parseToken();
		
		//Optional declaration params
		if (lookat.type == this.TOK_SPECIAL && lookat.token == '{')
		{
			declaration.params = this.parseParams();
			lookat = this.parseToken();
			if (lookat.type == this.TOK_SPECIAL && lookat.token == '}')
				lookat = this.parseToken();
			else
				this.expectError(lookat, "'}'");
		}
		
		//Declaration close
		if (lookat.type == this.TOK_SPECIAL && lookat.token == ':')
		{
			declaration.statements = this.parseStatementList(this.OP_AND);
			var newline = this.parseToken();
			if (newline.type == this.TOK_SPECIAL && newline.token == '\n')
				;
			else
				this.expectError(newline, "newline");
		}
		else
			this.expectError(lookat, "':'");
	}
	else
		this.expectError(label, "label");
	return declaration;
}

snakeEx.parseCharacterClass = function()
{
	//HACK: this whole system for negating gets pretty hacky
	var obj = { type: this.NODE_CHARCLASS };
	
	var peek = this.peekToken();
	if (peek.type == this.TOK_SPECIAL && peek.token == "^")
	{
		obj.negate = true;
		this.parseToken();
	}
	
	var token = this.parseToken()
	if (token.type == this.TOK_STRING)
	{
		obj.string = token.token;
	}
	else
		this.expectError(token, "string");
	
	return obj;
}

snakeEx.parseStatementList = function(op)
{
	//Make this a character class instead if it's negated
	//HACK: treat other things as character classes?
	var peek = this.peekToken();
	if (peek.type == this.TOK_SPECIAL && peek.token == "^")
	{
		return snakeEx.parseCharacterClass();
	}
	
	if (this.DEBUG_PARSER) console.log("statementlist");
	
	var obj = { type: this.NODE_STATEMENTLIST, op: op }
	
	var statements = [];
	while (!this.closesStatementList(this.peekToken()) && this.errors.length == 0)
	{
		statements.push(this.parseStatement());
	}
	
	//Fix-up: break up strings under OR semantics
	if (op == this.OP_OR)
	{
		for (var c = 0; c < statements.length; c++)
		{
			if (statements[c].type == this.NODE_STRING && statements[c].string.length > 1)
			{
				var working = statements[c].string
				statements[c].string = statements[c].string.charAt(0);
				for (var d = 1; d < working.length; d++)
				{
					//HACK: messes up the order, doesn't really matter though
					var newstatement = { type: this.NODE_STRING, string: working.charAt(d) };
					statements.splice(c, 0, newstatement);
					c++;
				}
			}
		}
	}
	
	//Fix-up: break up closures and ops tacked on to unparenthetical strings
	//HACK: see closure code
	for (var c = 0; c < statements.length; c++)
	{
		var inner = statements[c].statement;
		if (statements[c].type == this.NODE_CLOSURE && inner.type == this.NODE_STRING && inner.string.length > 1)
		{
			var newstatement = { type: this.NODE_STRING, string: inner.string.substr(0, inner.string.length-1) };
			inner.string = inner.string.substr(inner.string.length-1, 1);
			statements.splice(c, 0, newstatement);
			c++;
		}
		else if (statements[c].type == this.NODE_PRECEDING && inner.type == this.NODE_STRING && inner.string.length > 1)
		{
			//TODO: BAD: this fails if enclosing a closure
			var newstatement = { type: this.NODE_STRING, string: inner.string.substr(1, inner.string.length-1) };
			inner.string = inner.string.substr(0, 1);
			statements.splice(c+1, 0, newstatement);
			c++;
		}
	}
	
	obj.statements = statements;
	return obj;
}

snakeEx.parseStatement = function()
{
	if (this.DEBUG_PARSER) console.log("statement");
	
	var statement = { type: this.NODE_INVALID };
	var token = this.peekToken();
	if (token.type == this.TOK_SPECIAL)
	{
		if (token.token == '(')
		{
			var open = this.parseToken();
			if (open.type == this.TOK_SPECIAL && open.token == '(')
			{
				statement = this.parseStatementList(this.OP_AND);
				var close = this.parseToken();
				if (close.type == this.TOK_SPECIAL && close.token == ')')
					;
				else
					this.expectError(close, "')'");
			}
			else
				this.expectError(open, "'('");
		}
		else if (token.token == '<')
		{
			statement = this.parseDirection();
		}
		else if (token.token == '{')
		{
			statement = this.parseCall();
		}
		else if (token.token == '[')
		{
			statement = this.parseClass();
		}
		else if (token.token == '$')
		{
			this.parseToken();
			statement.type = this.NODE_OUTOFBOUNDS;
		}
		else if (token.token == '.')
		{
			this.parseToken();
			statement.type = this.NODE_WILDCARD;
		}
		else if (token.token == '!' || token.token == '~' || token.token == '`')
		{
			this.parseToken();
			statement.type = this.NODE_PRECEDING;
			statement.op = token.token;
			statement.statement = this.parseStatement();
		}
		else
		{
			this.expectError(token, "statement");
			return statement;
		}
	}
	else if (token.type == this.TOK_STRING)
	{
		statement.type = this.NODE_STRING;
		statement.string = this.parseToken().token;
	}
	else
	{
		this.expectError(token, "statement");
		return statement;
	}
	
	//Parse closures
	//HACK: should be done differently
	while (this.isClosure(this.peekToken()) && this.errors.length == 0)
	{
		if (this.DEBUG_PARSER) console.log("(closure)");
		
		statement = { type: this.NODE_CLOSURE, statement: statement, op: this.parseToken().token };
		
		if (statement.op == '%')
			statement.bounds = this.parseBounds();
	}
	
	return statement;
}

snakeEx.parseBounds = function()
{
	var bounds = {};
	
	var token = this.parseToken();
	if (token.type == this.TOK_SPECIAL && token.token == '{')
	{
		var token = this.parseToken();
		if (token.type == this.TOK_STRING)
		{
			var split = token.token.split(',');
			if (split.length == 0)
				this.errors.push(this.errloc(token.line, token.col) + " not enough values in bounds.");
			else if (split.length == 1)
			{
				bounds.min = bounds.max = parseInt(split[0]);
				if (isNaN(bounds.min))
					this.expectError(token, "integer");
			}
			else if (split.length == 2)
			{
				if (split[0].length > 0)
				{
					bounds.min = parseInt(split[0]);
					if (isNaN(bounds.min))
						this.expectError(token, "integer");
				}
				if (split[1].length > 0)
				{
					bounds.max = parseInt(split[1]);
					if (isNaN(bounds.max))
						this.expectError(token, "integer");
				}
			}
			else
				this.errors.push(this.errloc(token.line, token.col) + " too many values in bounds.");
			
			var token = this.parseToken();
			if (token.type == this.TOK_SPECIAL && token.token == "}")
				;
			else
				this.expectError(token, "}");
		}
		else
			this.expectError(token, "number or ','");
	}
	else
		this.expectError(token, "'{'");
	
	return bounds;
}

snakeEx.parseDirection = function()
{
	if (this.DEBUG_PARSER) console.log("direction");
	
	var direction = { type: this.NODE_DIRECTION, direction:"" };
	var open = this.parseToken();
	if (open.type == this.TOK_SPECIAL && open.token == '<')
	{
		var dirtoken = this.parseToken();
		while ((dirtoken.type == this.TOK_STRING && this.isDirection(dirtoken.token))
			|| (dirtoken.type == this.TOK_SPECIAL && this.isSpecialDirection(dirtoken.token)))
		{
			//TODO: special characters other than . not by themselves is an error
			if (dirtoken.type == this.TOK_SPECIAL && dirtoken.token == '.')
				direction.abs = true;
			else
				direction.direction += dirtoken.token;
			dirtoken = this.parseToken();
		}
		
		if (dirtoken.type == this.TOK_SPECIAL && dirtoken.token == '>')
			;
		else
			this.expectError(dirtoken, "'>'");
		
		if (direction.direction == "")
		{
			//Fill empty direction
			direction.direction = 'F';
		}
	}
	else
		this.expectError(open, "'<'");
	
	return direction;
}

snakeEx.parseCall = function()
{
	if (this.DEBUG_PARSER) console.log("call");
	
	var call = { type: this.NODE_CALL };
	var open = this.parseToken();
	if (open.type == this.TOK_SPECIAL && open.token == '{')
	{
		var name = this.parseToken();
		if (name.type == this.TOK_STRING)
		{
			call.name = name.token;
			call.direction = this.parseDirection();
			
			var close = this.peekToken();
			if (close.type == this.TOK_STRING)
			{
				//Parse parameters
				call.params = this.parseParams();
			}
			
			var close = this.parseToken();
			if (close.type == this.TOK_SPECIAL && close.token == '}')
				;
			else
				this.expectError(close, "'}'");
		}
		else
			this.expectError(name, "label");
	}
	else
		this.expectError(open, "'{'");
	
	return call;
}

snakeEx.parseParams = function()
{
	if (this.DEBUG_PARSER) console.log("params");
	
	var close = this.parseToken();
	var call = { type: this.NODE_PARAMS };
	var params = close.token;
	for (var d = 0; d < params.length; d++)
	{
		if (params.charAt(d) == 'P')
			call.piggyback = true;
		else if (params.charAt(d) == 'H')
			call.wrapX = true;
		else if (params.charAt(d) == 'V')
			call.wrapY = true;
		else if (params.charAt(d) == 'W')
			call.wrapX = call.wrapY = true;
		else if (params.charAt(d) == 'E')
			call.exclusive = true;
		else if (params.charAt(d) == 'I')
			call.insensitive = true;
		else if (params.charAt(d) == 'A')
			call.advance = true;
		else if (params.charAt(d) == 'S')
			call.noMark = true;
		else if (params.charAt(d) == 'L')
			call.onlyMarked = true;
		else if (params.charAt(d) >= '0' && params.charAt(d) <= '9')
			call.group = params.charAt(d) - '0';
		else
			this.errors.push(this.errloc(close.line, close.col) + " Unrecognized call parameter '" + params.charAt(d) + "'.");
	}
	return call;
}

snakeEx.parseClass = function()
{
	if (this.DEBUG_PARSER) console.log("class");
	
	var rclass = { type: this.NODE_CLASS };
	var open = this.parseToken();
	if (open.type == this.TOK_SPECIAL && open.token == '[')
	{
		rclass.statements = this.parseStatementList(this.OP_OR);
		
		var lookat = this.parseToken();
		if (lookat.type == this.TOK_SPECIAL && lookat.token == ']')
			;
		else
			this.expectError(lookat, "']'");
	}
	else
		this.expectError(open, "'['");
	
	return rclass;
}

snakeEx.specialCharacters = ":+*?~%<>()[]{}!.$-^\n\\`";
snakeEx.isSpecialCharacter = function(c)
{
	for (var d = 0; d < this.specialCharacters.length; d++)
	{
		if (this.specialCharacters.charAt(d)===c)
			return true;
	}
	return false;
}

snakeEx.runtimeError = function(error)
{
	this.errors.push(error);
}

snakeEx.getDeclaration = function(name)
{
	if (!this.program || !this.program.declarations || this.program.declarations.length == 0)
		return null;
	for (var c = 0; c < this.program.declarations.length; c++)
	{
		if (this.program.declarations[c].name == name)
			return this.program.declarations[c];
	}
	return null;
}

snakeEx.cloneState = function(state)
{
	if (state.length !== undefined)
	{
		var newstate = [];
		for (var i = 0; i < state.length; i++)
			newstate.push(this.cloneState(state[i]));
		return newstate;
	}
	var newState = { x:state.x, y:state.y, dx:state.dx, dy:state.dy, age:state.age };
	if (state.noMark) newState.noMark = true;
	if (state.wrapX) newState.wrapX = true;
	if (state.wrapY) newState.wrapY = true;
	if (state.excl) newState.excl = true; //exclusive
	if (state.ins) newState.ins = true //case-insensitive
	if (state.wrapped) newState.wrapped = state.wrapped;
	if (state.onlyMarked) newState.onlyMarked = true;
	if (state.marks)
	{
		newState.marks = [];
		for (var c = 0; c < state.marks.length; c++)
			newState.marks.push(state.marks[c]);
	}
	if (state.g)
	{
		newState.g = {};
		for (var i in state.g)
			newState.g[i] = state.g[i];
	}
	return newState;
}

snakeEx.checkStateGroup = function(state, group, age)
{
	if (group === undefined)
		return state;
	if (!state.g)
		state.g = {};
	if (state.g[group] === undefined)
		state.g[group] = age;
	else if (state.g[group] !== age)
		return null;
	return state;
}

/// resets the state after returning from a call
snakeEx.resetStateTo = function(state, oldstate, piggyback)
{
	if (!state) return state;
	if (!piggyback)
	{
		state.x = oldstate.x; state.y = oldstate.y;
		state.dx = oldstate.dx; state.dy = oldstate.dy;
	}
	state.wrapX = oldstate.wrapX; state.wrapY = oldstate.wrapY;
	state.excl = oldstate.excl; state.ins = oldstate.ins;
	state.age = oldstate.age; state.wrapped = oldstate.wrapped;
	state.onlyMarked = oldstate.onlyMarked;
	state.noMark = oldstate.noMark;
	return state;
}

snakeEx.advanceState = function(state, noMark)
{
	if (state.length !== undefined)
	{
		for (var c = 0; c < state.length; c++)
		{
			if (!(state[c] = this.advanceState(state[c], noMark)))
				state.splice(c--,1);
		}
		return state;
	}
	
	if (state.marks && state.onlyMarked)
	{
		//only marked: fail if we try to match an unmarked node
		var found = false;
		for (var c = 0; c < state.marks.length; c += 2)
		{
			if (state.x == state.marks[c] && state.y == state.marks[c+1])
			{
				found = true;
				break;
			}
		}
		if (!found) return null;
	}
	else if (state.marks && state.excl && !state.onlyMarked)
	{
		//Exclusivity: fail if we try to match an already-marked node
		for (var c = 0; c < state.marks.length; c += 2)
		{
			if (state.x == state.marks[c] && state.y == state.marks[c+1])
			{
				return null;
			}
		}
	}
	
	if (!noMark)
		this.stateMarkCurrent(state);
	state.x += state.dx;
	state.y += state.dy;
	
	if (state.wrapped) state.wrapped = false;
	
	//Handle wrap
	if (state.wrapY)
	{
		if (state.y < 0)
		{
			state.y = this.searchGrid.length-1;
			state.wrapped = true;
		}
		if (state.y >= this.searchGrid.length)
		{
			state.y = 0;
			state.wrapped = true;
		}
	}
	if (state.wrapX)
	{
		if (state.x < 0)
		{
			state.x = this.searchGrid[state.y].length-1;
			state.wrapped = true;
		}
		if (state.x >= this.searchGrid[state.y].length)
		{
			state.x = 0;
			state.wrapped = true;
		}
	}
	
	state.age++;
	return state;
}

snakeEx.caseInsensitiveMatch = function(ch1, ch2)
{
	return ch1.toUpperCase() == ch2.toUpperCase();
}

snakeEx.tryRead = function(state, target)
{
	if (state.y >= 0 && state.y < this.searchGrid.length && state.x >= 0 && state.x < this.searchGrid[state.y].length)
	{
		var match = false;
		if (this.searchGrid[state.y][state.x] == target)
			match = true;
		else if (state.ins && this.searchGrid[state.y][state.x].toUpperCase() == target.toUpperCase())
			match = true;
		if (match)
		{
			state = this.advanceState(state);
			return state;
		}
		else
			return null;
	}
	else
		return null;
}

snakeEx.addStateToArray = function(array, state)
{
	if (array.length === undefined)
		array = [ array ];
	if (state.length !== undefined)
	{
		for (var i = 0; i < state.length; i++)
			array.push(state[i]);
	}
	else
	{
		array.push(state);
	}
	return array;
}

snakeEx.tryReadClass = function(state, element)
{
	if (state.y >= 0 && state.y < this.searchGrid.length && state.x >= 0 && state.x < this.searchGrid[state.y].length)
	{
		var match = false;
		var readHead = this.searchGrid[state.y][state.x];
		
		//treat nbsp as space
		if (readHead.charCodeAt(0) === 0xA0) readHead = ' ';
		
		for (var c = 0; !match && c < element.string.length; c++)
		{
			var target = element.string.charAt(c);
			if (readHead === target)
				match = true;
			else if (state.ins && readHead.toUpperCase() === target.toUpperCase())
				match = true;
		}
		if (match != element.negate)
		{
			state = this.advanceState(state);
			return state;
		}
		else
			return null;
	}
	else
		return null;
}

snakeEx.tryReadAny = function(state)
{
	if (state.y >= 0 && state.y < this.searchGrid.length && state.x >= 0 && state.x < this.searchGrid[state.y].length)
	{
		state = this.advanceState(state);
		return state;
	}
	else
		return null;
}

snakeEx.tryReadOutOfBounds = function(state)
{
	if (state.y >= 0 && state.y < this.searchGrid.length && state.x >= 0 && state.x < this.searchGrid[state.y].length)
	{
		return null;
	}
	else
	{
		state = this.advanceState(state);
		return state;
	}
}

snakeEx.stateMarkCurrent = function(state)
{
	if (!state.noMark)
	{
		if (!state.marks) state.marks = [];
		
		//Return if it is already marked
		//HACK: slow
		for (var c = 0; c < state.marks.length; c += 2)
		{
			if (state.marks[c] == state.x && state.marks[c+1] == state.y)
				return state;
		}
		
		state.marks.push(state.x);
		state.marks.push(state.y);
	}
	return state;
}

snakeEx.stateChangeDirectionStr = function(state, str, abs)
{
	//Absolute reset
	if (abs)
	{
		state.dx = 1; state.dy = 0;
	}
	
	if (str == '!')
	{
		//Branch in every direction
		var retstates = [];
		for (var y = 0; y < this.searchGrid.length; y++)
		{
			for (var x = 0; x < this.searchGrid[y].length; x++)
			{
				if (state.x !== x || state.y !== y)
				{
					var newstate = this.cloneState(state);
					newstate.dx = x-state.x; newstate.dy = y-state.y;
					retstates.push(newstate);
				}
			}
		}
		return retstates;
	}
	else if (str == '*')
	{
		//Branch in 8 directions
		var retstates = [];
		for (var x = -1; x <= 1; x++)
		{
			for (var y = -1; y <= 1; y++)
			{
				if (x != 0 || y != 0)
					retstates.push(this.stateChangeDirection(this.cloneState(state), x, y));
			}
		}
		return retstates;
	}
	else if (str == '+')
	{
		//Branch in 4 directions
		var retstates = [];
		retstates.push(this.stateChangeDirection(this.cloneState(state), 1, 0));
		retstates.push(this.stateChangeDirection(this.cloneState(state), -1, 0));
		retstates.push(this.stateChangeDirection(this.cloneState(state), 0, 1));
		retstates.push(this.stateChangeDirection(this.cloneState(state), 0, -1));
		return retstates;
	}
	else if (str == 'X')
	{
		//Branch in 4 diagonal directions
		var retstates = [];
		for (var x = -1; x <= 1; x++)
		{
			for (var y = -1; y <= 1; y++)
			{
				if (x != 0 && y != 0)
					retstates.push(this.stateChangeDirection(this.cloneState(state), x, y));
			}
		}
		return retstates;
	}
	else if (str == 'T')
	{
		//Branch left, right
		var retstates = [];
		retstates.push(this.stateChangeDirection(this.cloneState(state), 1, 0));
		retstates.push(this.stateChangeDirection(this.cloneState(state), -1, 0));
		return retstates;
	}
	else if (str == 'P')
	{
		//Branch forward, left, right
		var retstates = [];
		retstates.push(this.stateChangeDirection(this.cloneState(state), 0, 1));
		retstates.push(this.stateChangeDirection(this.cloneState(state), 1, 0));
		retstates.push(this.stateChangeDirection(this.cloneState(state), -1, 0));
		return retstates;
	}
	else
	{
		//Add up the characters and figure out where we're going
		var x = 0;
		var y = 0;
		for (var c = 0; c < str.length; c++)
		{
			if (str.charAt(c) == 'R')
				x--;
			else if (str.charAt(c) == 'L')
				x++;
			else if (str.charAt(c) == 'F')
				y++;
			else if (str.charAt(c) == 'B')
				y--;
			else
				this.runtimeError("Couldn't understand direction '" + str + "'.");
		}
		return this.stateChangeDirection(state, x, y);
	}
}

snakeEx.stateChangeDirection = function(state, x, y)
{
	if (x !== 0 || y !== 0)
	{
		if (state.dx == 0)
		{
			if (state.dy < 0)
			{
				state.dx = -x; state.dy = -y;
			}
			else
			{
				state.dx = x; state.dy = y;
			}
		}
		else if (state.dy == 0)
		{
			if (state.dx < 0)
			{
				state.dy = x; state.dx = -y;
			}
			else
			{
				state.dy = -x; state.dx = y;
			}
		}
		else if (state.dx < 0 && state.dy < 0)
		{
			state.dx = -x-y; state.dy = x-y;
		}
		else if (state.dx < 0 && state.dy > 0)
		{
			state.dx = x-y; state.dy = x+y;
		}
		else if (state.dx > 0 && state.dy < 0)
		{
			state.dx = -x+y; state.dy = -x-y;
		}
		else if (state.dx > 0 && state.dy > 0)
		{
			state.dx = x+y; state.dy = -x+y;
		}
		else
		{
			console.log(state);
			this.runtimeError("Implmentation error applying direction '" + x + ", " + y + "' to '" + state.dx + ", " + state.dy + "'.");
		}
		
		//Restrict magnitude
		if (Math.abs(x) <= 1 && Math.abs(y) <= 1)
		{
			state.dx = Math.sign(state.dx);
			state.dy = Math.sign(state.dy);
		}
	}
	return state;
}

snakeEx.getParam = function(name, call, dec)
{
	if (call && call.params)
	{
		if (call.params[name] !== undefined)
			return call.params[name];
	}
	if (dec && dec.params)
	{
		if (dec.params[name] !== undefined)
			return dec.params[name];
	}
	return undefined;
}

/// runs an element from the program tree, returning the resulting state
snakeEx.execute = function(element, state)
{
	if (this.errors.length > 0) return null;
	if (!state || state.length === 0) return null;
	
	//if (--this.timeout <= 0) return null;
	
	//If this is an array of states, execute each state and return only successful ones
	if (state.length !== undefined)
	{
		var newstates = [];
		for (var c = 0; c < state.length; c++)
		{
			if (state[c])
			{
				var gotstate = this.execute(element, state[c]);
				if (gotstate) this.addStateToArray(newstates, gotstate);
			}
		}
		if (newstates.length == 0)
			return null;
		else if (newstates.length == 1)
			return newstates[0];
		else
			return newstates;
		return null; //Safety
	}
	
	if (state.age === undefined) state.age = 0;
	
	//Verify not stalled
	if (state.dx == 0 && state.dy == 0)
	{
		this.runtimeError("Implementation error: snake stalled.");
		return null;
	}
	
	//This is a single state, advance it
	switch (element.type)
	{
	case this.NODE_INVALID:
		this.runtimeError("Invalid element in parse tree.");
		return null;
		
	case this.NODE_PROGRAM:
		var dec = this.program.declarations[0];
		if (!dec)
		{
			this.runtimeError("No declarations.");
			return null;
		}
		this.timeout = 500;
		
		//Manufacture a fake call to start with
		var call = { type: this.NODE_CALL, name: dec.name, direction: { type: this.NODE_DIRECTION, direction: "F" } };
		
		return this.execute(call, state);
		
	case this.NODE_DECLARATION:
		return this.execute(element.statements, state);
		
	case this.NODE_STRING:
		for (var c = 0; c < element.string.length; c++)
		{
			if (!this.tryRead(state, element.string.charAt(c)))
				return null;
		}
		return state;
		
	case this.NODE_CLASS:
		return this.execute(element.statements, state);
		
	case this.NODE_CALL:
		var dec = this.getDeclaration(element.name);
		if (!dec)
		{
			this.runtimeError("Could not find declaration '" + element.name + "'.");
			return null;
		}
		
		var oldstate = this.cloneState(state);
		
		var piggyback = this.getParam("piggyback", element, dec);
		if (!piggyback)
			state = this.cloneState(state);
		state.age = 0;
		
		if (this.getParam("wrapX", element, dec)) state.wrapX = true;
		if (this.getParam("wrapY", element, dec)) state.wrapY = true;
		if (this.getParam("exclusive", element, dec)) state.excl = true;
		if (this.getParam("insensitive", element, dec)) state.ins = true;
		if (this.getParam("noMark", element, dec)) state.noMark = true;
		if (this.getParam("onlyMarked", element, dec)) state.onlyMarked = true;
		
		state = this.stateChangeDirectionStr(state, element.direction.direction, element.direction.abs);
		state = this.execute(dec, state);
		
		//Reset positional information and check groups
		if (state)
		{
			if (state.length !== undefined)
			{
				for (var c = 0; c < state.length; c++)
				{
					state[c] = this.checkStateGroup(state[c], this.getParam("group", element, dec), state[c].age);
					state[c] = this.resetStateTo(state[c], oldstate, piggyback);
					if (!state[c]) state.splice(c--,1);
				}
			}
			else
			{
				state = this.checkStateGroup(state, this.getParam("group", element, dec), state.age);
				state = this.resetStateTo(state, oldstate, piggyback);
			}
		}
		
		if (state && this.getParam("advance", element, dec))
			state = this.advanceState(state, true);
		
		return state;
		
	case this.NODE_GROUP:
		return this.execute(element.statements, state);
		
	case this.NODE_DIRECTION:
		return this.stateChangeDirectionStr(state, element.direction, element.abs);
		
	case this.NODE_CLOSURE:
		if (element.op == '*')
		{
			//match statement 0 or more times
			var newstates = [];
			newstates.push(this.cloneState(state));
			var branchstate = this.cloneState(state);
			while (branchstate = this.execute(element.statement, branchstate))
			{
				this.addStateToArray(newstates, branchstate);
				branchstate = this.cloneState(branchstate);
			}
			return newstates;
		}
		else if (element.op == '+')
		{
			//match statement 1 or more times
			var newstates = [];
			var branchstate = this.cloneState(state);
			while (branchstate = this.execute(element.statement, branchstate))
			{
				this.addStateToArray(newstates, branchstate);
				branchstate = this.cloneState(branchstate);
			}
			return newstates;
		}
		else if (element.op == '?')
		{
			//match statement 0 or 1 times
			var newstates = [];
			newstates.push(this.cloneState(state));
			var branchstate = this.cloneState(state);
			if (branchstate = this.execute(element.statement, branchstate))
				this.addStateToArray(newstates, branchstate);
			return newstates;
		}
		else if (element.op == '%')
		{
			//match statement min to max times (either can be undefined)
			var newstates = [];
			var branchstate = this.cloneState(state);
			var index = 0;
			while (branchstate = this.execute(element.statement, branchstate))
			{
				index++;
				if (element.bounds.max !== undefined && index > element.bounds.max)
					break;
				if (index >= (element.bounds.min ? element.bounds.min : 0))
					this.addStateToArray(newstates, branchstate);
				branchstate = this.cloneState(branchstate);
			}
			return newstates;
		}
		else
		{
			this.runtimeError("Unknown closure '" + element.op + "'.");
			return null;
		}
		
	case this.NODE_STATEMENTLIST:
		if (element.op === this.OP_OR)
		{
			var retstates = [];
			for (var c = 0; c < element.statements.length; c++)
			{
				var newstate = this.cloneState(state);
				newstate = this.execute(element.statements[c], newstate);
				if (newstate) retstates.push(newstate);
			}
			if (retstates.length > 1)
				return retstates;
			else if (retstates.length == 1)
				return retstates[0];
			else
				return null;
			return retstates;
		}
		else if (element.op === this.OP_AND)
		{
			for (var c = 0; c < element.statements.length; c++)
				state = this.execute(element.statements[c], state);
			return state;
		}
		else
		{
			this.runtimeError("Implementation error: unknown statementlist operation '" + element.op + "'.");
			return null;
		}
		
	case this.NODE_OUTOFBOUNDS:
		return this.tryReadOutOfBounds(state);
		
	case this.NODE_WILDCARD:
		return this.tryReadAny(state);
		
	case this.NODE_CHARCLASS:
		return this.tryReadClass(state, element);
		
	case this.NODE_PRECEDING:
		if (element.op == '!')
		{
			//Logical not
			var oldstate = this.cloneState(state);
			state = this.execute(element.statement, state);
			if (state && !state.length)
				return null;
			else
				return oldstate;
		}
		else if (element.op == '~')
		{
			var oldMark = state.noMark;
			state.noMark = true;
			state = this.execute(element.statement, state);
			if (state)
			{
				if (state.length !== undefined)
				{
					for (var c = 0; c < state.length; c++)
						state[c].noMark = oldMark;
				}
				else
					state.noMark = oldMark;
			}
			return state;
		}
		else if (element.op == '`')
		{
			var oldMark = state.onlyMarked;
			state.onlyMarked = true;
			state = this.execute(element.statement, state);
			if (state)
			{
				if (state.length !== undefined)
				{
					for (var c = 0; c < state.length; c++)
						state[c].onlyMarked = oldMark;
				}
				else
					state.onlyMarked = oldMark;
			}
			return state;
		}
		else
		{
			this.runtimeError("Unknown closure '" + element.op + "'.");
			return null;
		}
	}
}

/// only records the success if its orig and marks are unique
snakeEx.recordSuccess = function(success, ignoreOrigin)
{
	for (var c = 0; c < this.successes.length; c++)
	{
		var sameAs = true;
		
		if (!ignoreOrigin && (this.successes[c].origX != success.origX || this.successes[c].origY != success.origY))
			continue;
		if (!this.successes[c].marks || !success.marks)
		{
			if (this.successes[c].marks == success.marks)
				return;
			else
				continue;
		}
		if (this.successes[c].marks.length != success.marks.length)
			continue;
		//HACK: sooo sloooooow
		var arr1 = this.successes[c].marks;
		var arr2 = success.marks;
		for (var d = 0; d < arr1.length; d += 2)
		{
			var found = false;
			for (var e = 0; e < arr2.length; e += 2)
			{
				if (arr1[d] == arr2[e] && arr1[d+1] == arr2[e+1])
				{
					found = true;
					break;
				}
			}
			if (!found)
			{
				sameAs = false;
				break;
			}
		}
		
		if (sameAs)
			return;
	}
	
	//If we got here, this is new
	this.successes.push(success);
}

snakeEx.find = function(input, stricterDuplicates)
{
	//Parse input into grid
	this.searchGrid = input.split("\n");
	
	this.successes = [];
	
	for (var y = -1; y <= this.searchGrid.length; y++)
	{
		if (y < 0)
			var rowlen = this.searchGrid[0].length;
		else if (y >= this.searchGrid.length)
			var rowlen = this.searchGrid[this.searchGrid.length-1].length;
		else
			var rowlen = this.searchGrid[y].length;
		for (var x = -1; x <= rowlen; x++)
		{
			var success = this.execute(this.program, { x:x, y:y, dx:1, dy:0 });
			if (success && success.length !== undefined && success.length == 0) success = null;
			if (success)
			{
				if (success.length !== undefined)
				{
					for (var c = 0; c < success.length; c++)
					{
						success[c].origX = x; success[c].origY = y;
						this.recordSuccess(success[c], stricterDuplicates);
					}
				}
				else
				{
					success.origX = x; success.origY = y;
					this.recordSuccess(success, stricterDuplicates);
				}
			}
			if (this.errors.length > 0) break;
		}
		if (this.errors.length > 0) break;
	}
}
