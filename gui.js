
gui = {};

gui.run = function()
{
	var codeDom = document.getElementById("codebox");
	var inputDom = document.getElementById("inputbox");
	
	this.input = "";
	this.currentSuccess = 0;
	this.successes = null;
	this.updateOutput();
	
	this.input = inputDom.value;
	if (!snakeEx.run(codeDom.value, this.input, true))
	{
		this.outErrors();
	}
	else
	{
		this.successes = snakeEx.successes;
		this.updateOutput();
	}
}

/// output the current contents of the error log
gui.outErrors = function()
{
	var outputDom = document.getElementById("outputbox");
	var errortext = '<span style="color:red;">';
	for (var c = 0; c < snakeEx.errors.length; c++)
		errortext += snakeEx.errors[c]+"<br/>";
	outputDom.innerHTML += errortext + '</span>';
}

/// output the currently selected match in a table
gui.updateOutput = function()
{
	var curDom = document.getElementById("curmatch");
	curDom.innerHTML = "" + (this.successes && this.successes.length > 0 ? this.currentSuccess + 1 : 0);
	var countDom = document.getElementById("matchcount");
	countDom.innerHTML = "" + (this.successes ? this.successes.length : 0);
	
	var outputDom = document.getElementById("outputbox");
	
	if (!this.successes || this.currentSuccess >= this.successes.length)
		var success = null;
	else
		var success = this.successes[this.currentSuccess];
	
	//Build input into a visual grid
	var visual = '<table style="font-family:monospace;font-size:large;text-align:center;"><tr>';
	var line = 0;
	var col = 0;
	for (var c = 0; c < this.input.length; c++)
	{
		if (this.input.charAt(c) == '\n')
		{
			visual += "</tr><tr>";
			line++;
			col = 0;
		}
		else
		{
			var content = this.input.charAt(c);
			
			//Italicize match originators
			if (success && success.origX == col && success.origY == line)
			{
				content = "<i><b>" + content + "</b></i>";
			}
			
			//Color match participants
			var mark = false;
			if (success && success.marks)
			{
				for (var e = 0; e < success.marks.length; e += 2)
				{
					if (success.marks[e] == col && success.marks[e+1] == line)
						mark = true;
				}
			}
			
			if (mark)
				content = '<td style="background-color:lime;">' + content + "</td>";
			else
				content = '<td style="background-color:gainsboro;">' + content + "</td>";
			
			visual += content;
			col++;
		}
	}
	visual += "</tr></table>";
	outputDom.innerHTML = visual;
}

gui.nextMatch = function() { this.navMatch(1); }
gui.prevMatch = function() { this.navMatch(-1); }

gui.navMatch = function(dir)
{
	this.currentSuccess += dir;
	if (this.currentSuccess >= this.successes.length)
		this.currentSuccess = 0;
	else if (this.currentSuccess < 0)
		this.currentSuccess = this.successes.length-1;
	this.updateOutput();
}