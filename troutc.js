var parser = require('./grammar.js');
var Compiler = require('./compiler');
var util = require('util');
var fs = require('fs');
if (process.argv.length < 3) {
	console.log("usage: node troutc.js <file.tr> [<out.js>]");
	process.exit(1);
} 
var source = fs.readFileSync(process.argv[2]).toString();

var ast;
try {
	ast = parser.parse(source);	
} catch (e) {
	var error = e.name+": line "+e.line+", column "+e.column+":\n";
	error += source.split('\n')[e.line - 1].replace(/\t/g, ' ');
	for (var i = 0; i < e.column; i++) {
		error += (i === e.column - 1) ? '^' : '-';
	}
	error += "\n" + e.message;

	console.error(error);
	process.exit(2);
}

var compiler = new Compiler();
try {
	var output = compiler.compile(ast);
	var out = process.argv.length < 4 ? process.stdout : fs.createWriteStream(process.argv[3]);
	out.write(new Buffer(output));
} catch (e) {
	console.error(e.message);
	console.error('  '+source.split('\n')[compiler.line_no - 1]);
}

// else {
// 	fs.readFile(process.argv[2], function (err, data) {
// 		var ast;
// 		try {
// 			ast = parser.parse(data.toString());	
// 		} catch (e) {
// 			var error = e.message + "\n";
// 			error += "line "+e.line+", column "+e.column;
// 			error += ": "+
// 			console.error(e.name + );
// 			process.exit(2);
// 		}
		
// 		var compiler = new Compiler();
// 		try {
// 			var output = compiler.compile(ast);
// 			var out = process.argv.length < 4 ? process.stdout : fs.createWriteStream(process.argv[3]);
// 			out.write(new Buffer(output));
// 		} catch (e) {
// 			console.error(e.message);
// 			console.error('  '+data.toString().split('\n')[compiler.line_no - 1]);
// 		}
// 		// try {
// 		// 	console.log(compiler.compile(ast = parser.parse(data.toString())));
// 		// 	process.stderr.write("                 |\n                 |\n                ,|.\n               ,\\|/.\n             ,' .V. `.\n            / .     . \\\n           /_`       '_\\\n          ,' .:     ;, `.\n          |@)|  . .  |(@|\n     ,-._ `._';  .  :`_,' _,-.\n    '--  `-\\ /,-===-.\\ /-'  --`\n   (----  _|  ||___||  |_  ----)\n    `._,-'  \\  `-.-'  /  `-._,'\n             `-.___,-'    Troutpiling complete...\n\n");
// 		// } catch (e) {
// 		// 	process.stderr.write("                 |\n                 |\n                ,|.\n               ,\\|/.\n             ,' .V. `.\n            / .     . \\\n           /_`       '_\\\n          ,' .:     ;, `.\n          |X)|  . .  |(X|\n     ,-._ `._';  .  :`_,' _,-.\n    '--  `-\\ /,-===-.\\ /-'  --`\n   (----  _|  ||___||  |_  ----)\n    `._,-'  \\  `-.-'  /  `-._,'\n             `-.___,-'    Troutpiling failure!\n\n");
// 		// 	process.stderr.write("Compile Error: "+e+"\n");
// 		// }
// 		// console.error(util.inspect(ast, false, null));
// 	});
// }
