var extend = require('./utils').extend;
var tr_objects = require('./objects');
var TrObject = tr_objects.TrObject;
var TrInlineFunction = tr_objects.TrInlineFunction;

var tr_default_ops = {
	'_?': {
		'void': new TrInlineFunction('fn(dynamic)bool', ['a:dynamic'], 'bool', function (args) {
			return new TrObject('bool', args.a.value !== null);
		})
	},
	'==': {
		'dynamic': new TrInlineFunction('fn(dynamic,dynamic)bool', ['a:dynamic', 'b:dynamic'], 'bool', function (args) {
			return new TrObject('bool', args.a.value === args.b.value);
		})
	},
	'!=': {
		'dynamic': new TrInlineFunction('fn(dynamic,dynamic)bool', ['a:dynamic', 'b:dynamic'], 'bool', function (args) {
			return new TrObject('bool', args.a.value !== args.b.value);
		})
	}
};
var tr_default_methods = {
	'to_string': {
		'void': new TrInlineFunction('fn(void)string', [], 'string', function (self, args) {
			return new TrObject('string', self.value !== null ? self.value.toString() : 'null');
		})
	}
};

var bool_ops = extend(tr_default_ops, 
{
	'!_': {
		'void': new TrInlineFunction('fn(bool)bool', ['a:bool'], 'bool', function (args) {
			return new TrObject('bool', !args.a.value);
		})
	},
	'&&': {
		'bool': new TrInlineFunction('fn(bool,bool)bool', ['a:bool','b:bool'], 'bool', function (args) {
			return new TrObject('bool', (args.a.value && args.b.value) === true);
		})
	},
	'||': {
		'bool': new TrInlineFunction('fn(bool,bool)bool', ['a:bool','b:bool'], 'bool', function (args) {
			return new TrObject('bool', (args.a.value || args.b.value) === true);
		})
	},
});
var bool_methods = {};
var int_ops = extend(tr_default_ops,
{
	'++_': {
		'void': new TrInlineFunction('fn(int)void', ['a:int'], 'int', function (args) {
			return new TrObject('int', ++args.a.value);
		})
	},
	'_++': {
		'void': new TrInlineFunction('fn(int)void', ['a:int'], 'int', function (args) {
			return new TrObject('int', args.a.value++);
		})
	},
	'--_': {
		'void': new TrInlineFunction('fn(int)void', ['a:int'], 'int', function (args) {
			return new TrObject('int', --args.a.value);
		})
	},
	'_--': {
		'void': new TrInlineFunction('fn(int)void', ['a:int'], 'int', function (args) {
			return new TrObject('int', args.a.value--);
		})
	},
	'%': {
		'int': new TrInlineFunction('fn(int,int)int', ['a:int', 'b:int'], 'int', function (args) {
			return new TrObject('int', args.a.value % args.b.value);
		})
	},
	'+': {
		'int': new TrInlineFunction('fn(int,int)int', ['a:int', 'b:int'], 'int', function (args) {
			return new TrObject('int', args.a.value + args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)float', ['a:int', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value + args.b.value);
		})
	},
	'-':{
		'int': new TrInlineFunction('fn(int,int)int', ['a:int', 'b:int'], 'int', function (args) {
			return new TrObject('int', args.a.value - args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)float', ['a:int', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value - args.b.value);
		})
	},
	'*': {
		'int': new TrInlineFunction('fn(int,int)int', ['a:int', 'b:int'], 'int', function (args) {
			return new TrObject('int', args.a.value * args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)float', ['a:int', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value * args.b.value);
		}),
		'string': new TrInlineFunction('fn(int,string)string', ['n:int', 'a:string'], 'string', function (args) {
			return new TrObject('string', new Array(args.n+1).join(args.a.value));
		})
	},
	'/': {
		'int': new TrInlineFunction('fn(int,int)int', ['a:int', 'b:int'], 'int', function (args) {
			return new TrObject('int', Math.floor(args.a.value / args.b.value));
		}),
		'float': new TrInlineFunction('fn(int,float)float', ['a:int', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value / args.b.value);
		})
	},
	'<': {
		'int': new TrInlineFunction('fn(int,int)bool', ['a:int', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value < args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)bool', ['a:int', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value < args.b.value);
		})
	},
	'>': {
		'int': new TrInlineFunction('fn(int,int)bool', ['a:int', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value > args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)bool', ['a:int', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value > args.b.value);
		})
	},
	'<=': {
		'int': new TrInlineFunction('fn(int,int)bool', ['a:int', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value <= args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)bool', ['a:int', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value <= args.b.value);
		})
	}, 
	'>=': {
		'int': new TrInlineFunction('fn(int,int)bool', ['a:int', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value >= args.b.value);
		}),
		'float': new TrInlineFunction('fn(int,float)bool', ['a:int', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value >= args.b.value);
		})
	},
});
var int_methods = {

};
var float_ops = extend(tr_default_ops, 
{
	'+': {
		'int': new TrInlineFunction('fn(float,int)float', ['a:float', 'b:int'], 'float', function (args) {
			return new TrObject('float', args.a.value + args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)float', ['a:float', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value + args.b.value);
		})
	},
	'-':{
		'int': new TrInlineFunction('fn(float,int)int', ['a:float', 'b:int'], 'float', function (args) {
			return new TrObject('float', args.a.value + args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)float', ['a:float', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value + args.b.value);
		})
	},
	'*': {
		'int': new TrInlineFunction('fn(float,int)float', ['a:float', 'b:int'], 'float', function (args) {
			return new TrObject('float', args.a.value * args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)float', ['a:float', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value * args.b.value);
		})
	},
	'/': {
		'int': new TrInlineFunction('fn(float,int)float', ['a:float', 'b:int'], 'float', function (args) {
			return new TrObject('float', args.a.value / args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)float', ['a:float', 'b:float'], 'float', function (args) {
			return new TrObject('float', args.a.value / args.b.value);
		})
	},
	'<': {
		'int': new TrInlineFunction('fn(float,int)bool', ['a:float', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value < args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)bool', ['a:float', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value < args.b.value);
		})
	},
	'>': {
		'int': new TrInlineFunction('fn(float,int)bool', ['a:float', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value > args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)bool', ['a:float', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value > args.b.value);
		})
	},
	'<=': {
		'int': new TrInlineFunction('fn(float,int)bool', ['a:float', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value <= args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)bool', ['a:float', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value <= args.b.value);
		})
	}, 
	'>=': {
		'int': new TrInlineFunction('fn(float,int)bool', ['a:float', 'b:int'], 'bool', function (args) {
			return new TrObject('bool', args.a.value >= args.b.value);
		}),
		'float': new TrInlineFunction('fn(float,float)bool', ['a:float', 'b:float'], 'bool', function (args) {
			return new TrObject('bool', args.a.value >= args.b.value);
		})
	},
});
var float_methods = {

};
var string_ops = extend(tr_default_ops, 
{
	'|': {
		'string': new TrInlineFunction('fn(string,string)string', ['a:string', 'b:string'], 'string', function (args) {
			return new TrObject('string', args.a.value + args.b.value);
		})
	},
	'*': {
		'int': new TrInlineFunction('fn(string,int)string', ['a:string', 'n:int'], 'string', function (args) {
			return new TrObject('string', new Array(args.n+1).join(args.a.value));
		})
	}
});
var string_methods = {

};

var tr_std_functions = {
	'print': {type:'fn(dynamic)void',const:true,args:['dynamic'],returns:'void'},
	'to_string': {type:'fn(dynamic)string',const:true,args:['dynamic'],returns:'string'},
	'strlen': {type:'fn(string)int',const:true,args:['string'],returns:'int'},
	'substr': {type:'fn(string,int,int)string',const:true,args:['string','int','int'],returns:'string'},
	'typeof': {type:'fn(dynamic)string',const:true,args:['dynamic'],returns:'string'},
	'sqrt': {type:'fn(dynamic)float',const:true,args:['dynamic'],returns:'float'},
	'assert': {type:'fn(bool)void',const:true,args:['bool'],returns:'void'}
};

function tr_setup_primitives (runtime) {
	runtime.declare_type('dynamic', tr_default_ops, tr_default_methods);
	runtime.declare_type('bool', bool_ops, bool_methods);
	runtime.declare_type('int', int_ops, int_methods);
	runtime.declare_type('float', float_ops, float_methods);
	runtime.declare_type('string', string_ops, string_methods);

	runtime._true = new TrObject('bool', true, true);
	runtime._false = new TrObject('bool', false, true);
};

function tr_setup_std_types (runtime) {
	// array
	// set
	// map
};

function tr_setup_functions (runtime) {
	runtime.current_scope.declare('print', 'fn(dynamic)void');
	runtime.current_scope.assign_variable('print', 
		runtime.create_function(['out'],['dynamic'], 'void', [], function (scope) {
			console.log(scope.get_variable('out').value);
		})
	);
	runtime.current_scope.declare('typeof', 'fn(dynamic)string');
	runtime.current_scope.assign_variable('typeof', 
		runtime.create_function(['obj'],['dynamic'], 'string', [], function (scope) {
			return new TrObject('string', scope.get_variable('obj').type);
		})
	);
	runtime.current_scope.declare('to_string', 'fn(dynamic)string');
	runtime.current_scope.assign_variable('to_string', 
		runtime.create_function(['obj'],['dynamic'], 'string', [], function (scope) {
			var v = scope.get_variable('obj').value;
			return new TrObject('string', v !== null ? v.toString() : 'null');
		})
	);
	runtime.current_scope.declare('substr', 'fn(string,int,int)string');
	runtime.current_scope.assign_variable('substr', 
		runtime.create_function(['s','i','n'],['string','int','int'], 'string', [], function (scope) {
			var v = scope.get_variable('s').value;
			var i = scope.get_variable('i').value;
			var n = scope.get_variable('n').value || undefined;
			return new TrObject('string', v.substr(i, n));
		})
	);
	runtime.current_scope.declare('strlen', 'fn(string)int');
	runtime.current_scope.assign_variable('strlen', 
		runtime.create_function(['s'],['string'], 'int', [], function (scope) {
			var v = scope.get_variable('s').value;
			return new TrObject('int', v.length || 0);
		})
	);
	runtime.current_scope.declare('sqrt', 'fn(dynamic)float');
	runtime.current_scope.assign_variable('sqrt', 
		runtime.create_function(['obj'],['dynamic'], 'float', [], function (scope) {
			return new TrObject('float', Math.sqrt(scope.get_variable('obj').value));
		})
	);
	runtime.current_scope.declare('assert', 'fn(bool)void');
	runtime.current_scope.assign_variable('assert', 
		runtime.create_function(['a'],['bool'], 'void', [], function (scope) {
			if (scope.get_variable('a').value !== true)
				runtime.fail("Assertion failed.");
		})
	);
};

var tr_primitives = {
	'int': {ops:int_ops,methods:int_methods},
	'float': {ops:float_ops,methods:float_methods},
	'string': {ops:string_ops,methods:string_methods},
	'void': {ops:tr_default_ops,methods:{}},
	'bool': {ops:bool_ops,methods:bool_methods},
	'dynamic': {ops:tr_default_ops,methods:tr_default_methods}
}

module.exports.tr_setup_primitives = tr_setup_primitives;
module.exports.tr_setup_std_types = tr_setup_std_types;
module.exports.tr_setup_functions = tr_setup_functions;
module.exports.tr_primitives = tr_primitives;
module.exports.tr_std_functions = tr_std_functions;
