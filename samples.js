
var samples = {};

samples.populateSamples = function()
{
	var contents = "";
	var notComma = true;
	for (var i = 0; i < this.list.length; i++)
	{
		if (this.list[i].code.length == 0) continue;
		if (notComma)
			notComma = false;
		else
			contents += ", ";
		contents += this.list[i].name;
		if (this.list[i].input.length > 0)
		{
			contents += " (";
			for (var d = 0; d < this.list[i].input.length; d++)
			{
				if (d > 0) contents += ")(";
				contents += '<a href="javascript:void(0);" onclick="samples.loadSample('+i+','+d+')">' + (d+1) + "</a>";
			}
			contents += ")";
		}
	}
	var dom = document.getElementById("samplebox");
	dom.innerHTML = contents;
}

samples.loadSample = function(sample, input)
{
	if (sample < this.list.length)
	{
		var codeDom = document.getElementById("codebox");
		codeDom.value = this.list[sample].code;
		if (input < this.list[sample].input.length)
		{
			var inputDom = document.getElementById("inputbox");
			inputDom.value = this.list[sample].input[input];
		}
	}
}

samples.list =
[
{
name:"1.Finding Chessboards",
code:"main:{v<R>2}{h<>1}\nv:{c<L>A1}+\nh:{c<R>A2}+\nc:_?(#_)+#?",
input:[
"~______~\n~##_#_#~\n~#_#_##~\n~##_#_#~\n~______~",
"#_##\n_#_#\n__#_\n#_#_\n#_#_"
]
},{
name:"2.Verifying Chessboards",
code:"main:{v<R>2}{h<>1}\nv:${c<L>A1}+$\nh:${c<R>A2}+$\nc:$_?(#_)+#?$",
input:[
"_#_#_#_#\n#_#_#_#_\n_#_#_#_#",
"_#_#_#__\n__#_#_#_\n_#_#_#__"
]
},{
name:"3.Rectangle of Digits",
code:"main:{column<R>A1}%{2,}\ncolumn:[0-9]%{2,}",
input:[
"hbrewvgr\n18774gwe\n84502vgv\n19844f22\ncrfegc77",
"uv88wn000\nvgr88vg0w\nv888wrvg7\nvvg88wv77"
]
},{
name:"4.Finding a Word in a Word Search",
code:"main:<*>GOLF",
input:[
"INOWCEF\nIFWNOPH\nVULUHGY\nGUYOIGI\nYTFUGYG\nFTGYIOO",
"BHTGIVUHSR\nBWEVYWHBWB\nBHTWBYTWYB"
]
},{
name:"5.Detect Square Inputs",
code:"main:{vert<R>1}{horiz<>1}\nvert:${check<L>A1}+$\nhoriz:${check<R>A1}+$\ncheck:$.+$",
input:[
"qwerty\nasdfgh\nzx vbn\nuiop[]\n`1234 \n67890-",
"hello\nworld"
]
},{
name:"6.Find Gliders in a Game of Life",
code:"main:<+>[({l1<R>A}{l2<R>A}{l3<R>})({l1<L>A}{l2<L>A}{l3<L>})]\nl1:##\\.\nl2:[(#\\.)(\\.#)]#\nl3:#\\.\\.",
input:[
"##...#..\n..#.##..\n#...#.#.\n#.#.....\n##...###\n...#.#..\n.#....#.",
"##...#.\n..#.###\n##..#.#\n#.#....\n##..###"
]
},{
name:"7.Match Nether Portals",
code:"main:{edge<R>A1}{core<R>A1}%{2,22}{edge<R>1}\nedge:~.X%{3,22}~.\ncore:X\\.+X",
input:[
"....X......\n.XXXXXX.XX.\n...X...X...\n.X.X...XXX.\n...X...X.X.\n.XXX...X.X.\nX..XXXXX.X.",
"XX..XXXX\nXX..X..X\nXX..X..X\n..X.X..X\n.X..X.XX"
]
},{
name:"8.Minecraft Chest Placement",
code:"main:~{s<>}~!{d<+>}\\.\ns:<+>.<BR>([$\\.]<R>)%{3}\nd:.<+>CC",
input:[
".......C..\n...C..C...\n.........C\n.CC...CC..\n.........."
]
},{
name:"9.Horizontal and Vertical Alignment",
code:"main:<R>?#~.*#",
input:[
".,.,.,.#.,\n,.,#,.,.,.\n.,.,.,.,.,\n,.,.,.,.,.\n.,.#.,##.,\n,.,.,.,.,.",
".,.#.,.,\n,.,.,.#.\n.,#,.,.,\n,.,.,.,#\n.#.,.,.,\n,.,.#.,.\n#,.,.,.,\n,.,.,#,."
]
},{
name:"10.Collinear Points",
code:"main:<!>#~.*#~.*#",
input:[
"........\n#..#..#.\n...#....\n#.......\n...#....",
".#..#\n#..#.\n#....\n..#.#"
]
},{
name:"11.Verify Prelude Syntax",
code:"",
input:[
"?1-(v  #1)-             \n1   0v ^(#    0)(1+0)#)!\n    (#)  ^#1-(0 #       ",
"#(#(##)##)##(\n)##(##(##)#)#"
]
},{
name:"12.Avoid the Letter Q",
code:"main:{vert<R>A}%{4}\nvert:[^Qq]%{4}",
input:[
"bhtklkwt\nqlwQklqw\nvtvlwktv\nkQtwkvkl\nvtwlkvQk\nvnvevwvx",
"zxvcmn\nxcvncn\nmnQxcv\nxcvmnx\nazvmne"
]
},{
name:"13.Diamond Mining",
code:"main:{tl<RB>1}{tr<RF>1}\ntl:X/*{bl<L>1}X\ntr:X\\\\*{br<R>1}X\nbl:X\\\\*X\nbr:X/*X",
input:[
"...X......X....\n../.\\..../.\\...\n./.X.\\..X...X..\nX.X.X.XX.\\./.\\.\n.\\.X.//.\\.X...X\n..\\./X...X.\\./.\n.X.X..\\./...X..\nX.X....X.......\n.X.............",
".X......./....\n.\\....X.......\n...X.\\.\\...X..\n..X.\\...\\.X.\\.\n...X.X...X.\\.X\n../X\\...\\...X.\n.X...\\.\\..X...\n..\\./.X....X..\n...X..../....."
]
},{
name:"14.Matching Crosses",
code:"main:{a<R>A}+{b<R>A}+{a<R>A}+\na:{e<>P1}{c<>P2}{e<>P3}\nb:{c<>P1}{c<>P2}{c<>P3}\ne:\\.+\nc:#+",
input:[
".......\n.###...\n######.\n######.\n.###...\n.###...\n.###.#.\n....###\n.....#.",
".######.\n...##...\n...##...\n........"
]
},{
name:"15.Match a Word in a Boggle Board",
code:"main{I}:<*>p<*>a<*>n<*>a<*>m<*>a",
input:[
"ExYPhNuy\nAfEKVsjL\noblGviCw\nDdOgArRn\nISepnmqc\nzMUkBGJQ",
"BpbrzTHY\nmAJVRLuF\njyXSPknK\nhoeGcsEl\nQCZagNMI\ndvUOqixt"
]
},{
name:"15.Match a Word in a Boggle Board (no reuse)",
code:"main{EI}:<*>p<*>a<*>n<*>a<*>m<*>a",
input:[
"EmYPhNuy\nAaaKVsjL\nonlGviCw\nDdOgFrRn\nISeHZmqc\nzMUkBGJQ",
"BpbrzTHY\nmAJVRLuF\njyXSPknK\nhoeGcsEl\nQCZagNMI\ndvUOqixt"
]
},{
name:"16.Wrap around the Edges",
code:"main{W}:{col<R>WA}%{3}\ncol:###",
input:[
"#..##\n#..##\n.....\n#..##",
"...##\n#..##\n#..##\n#..#."
]
},{
name:"EX.Maze Solver!",
code:"main{E}:$(<P>\\.)+$",
input:[
"+-+-+-+-+-+-+-+-+-+-+\n..|...|...|...|...|.|\n+.+-+.+.+.+-+.+.+.+.+\n|.......|...|.|.|.|.|\n+.+-+-+-+-+.+.+.+.+.+\n|.|...|...|.|.|.|...|\n+.+.+.+.+.+.+.+.+-+-+\n|.|.|...|.|.|.|.....|\n+.+.+-+-+.+.+.+-+-+.+\n|.|...|...|.|.....|.|\n+.+-+.+-+-+.+-+-+.+.+\n|...|.....|...|.....|\n+-+.+-+-+.+-+.+.+-+-+\n|.|.|...|...|.|...|.|\n+.+.+-+.+-+.+.+-+.+.+\n|.|.....|.......|...|\n+.+-+-+-+.+-+.+.+.+-+\n|.....|...|...|.|...|\n+-+-+.+-+-+.+-+-+.+.+\n|.................|..\n+-+-+-+-+-+-+-+-+-+-+"
]
},{
name:"EX.Brace Matching",
code:"main:\\(~{r<>P}\\)\nr:[^\\(\\)]*(\\({r<>P}\\))?[^\\(\\)]*",
input:[
"#(#(##)##)##(\n)##(##(##)#)#"
]
}
]