var utils = require('./utils');
var _runtime = require('./runtime');

var TrObject = function(type, val, constant) {
  this.type = type;
  this.value = val;
  this.const = constant;
  this.is_reference = type[0] === '&';
  this.ref_count = 0;
};
TrObject.prototype.delete = function () {

};
TrObject.prototype.copy = function () {
  return new TrObject(this.type,this.value,this.const);
};

var TrFunction = function(runtime, argnames, argtypes, returns, scope, body) {
  this.type = 'fn(';
  if (argnames.length !== argtypes.length)
    throw "TrFunction constructor parameters 'argnames' and 'argtypes' expected to be the same length.";
  this.scope = scope; // scope already has ownership "implanted" from parent -> compiler determined
  for (var i = 0; i < argtypes.length; i++) {
    this.type += argtypes[i];
    if (i !== argtypes.length-1)
      this.type += ',';
    //this.scope.declare(argnames[i], argtypes[i]);
  }
  this.type += ')' + returns;
  this.argnames = argnames;
  this.argtypes = argtypes;
  this.returns = returns;
  this.value = body;
  this.runtime = runtime;
};
TrFunction.prototype = new TrObject('(void->void)');
TrFunction.prototype.constructor = TrFunction;
TrFunction.delete = function () {
  this.scope.teardown();
};
TrFunction.prototype.call_function = function (args) {
  var execution_scope = new _runtime.TrScope(this.scope.memory, this.scope);
  for (var i = 0; i < args.length; i++) {
    var t = this.argtypes[i];
    var a = this.argnames[i];

    execution_scope.declare(a,t,false);
    execution_scope.assign_by_name(a,args[i]); 
  }
  var old = this.runtime.current_scope;
  this.runtime.current_scope = execution_scope;
  var r = this.value(execution_scope);
  this.runtime.current_scope = old;
  execution_scope.teardown();
  return r;
};

var TrInlineFunction = function (type, args, returns, body) {
  this.type = type;
  this.args = args;
  this.returns = returns;
  this.value = body;
};
TrInlineFunction.prototype = new TrFunction(undefined,[],[]);
TrInlineFunction.prototype.constructor = TrInlineFunction;
TrInlineFunction.prototype.call_function = function (_ignore, args) {
  if (args.length != this.args.length)
    throw "Function expected "+this.args.length+" arguments, but got "+args.length;
  var vargs = {};
  for (var i = 0; i < this.args.length; i++) {
    vargs[this.args[i].split(':')[0]] = args[i];
  }
  return this.value(vargs);
};

var TrType = function (ops, methods) {
  this.ops = ops;
  this.methods = methods;
  this.is_primitive = true;
};
TrType.prototype = new TrObject('type', null, true);
TrType.prototype.constructor = TrType;
TrType.prototype.get_operator = function (op, self, args) { // returns a TrInlineFunction
  args = args || [];
  if (!(op in this.ops))
    throw "Operator '"+op+"' not defined for the type '"+self.type+"'";
  var operator = this.ops[op];
  var arg_str = '';
  for (var i = 0; i < args.length; i++) {
    if (i > 0)
      arg_str += ',';
    arg_str += args[i].type;
  }
  if (args.length === 0)
    arg_str = 'void';
  if (!(arg_str in operator || 'dynamic' in operator))
    throw "Operator '"+op+"' for the type '"+self.type+"' is not defined to act on types ("+arg_str+")";
  return operator[arg_str] || operator['dynamic'];
};
TrType.prototype.get_method = function (m, self, args, kwargs) {
  args = args || [];
  kwargs = kwargs || {};
  if (!(m in this.methods))
    throw "Method '"+m+"' not defined for the type '"+self.type+"'";
  var method = this.methods[m];
  var arg_str = '';
  for (var i = 0; i < args.length; i++) {
    if (i > 0)
      arg_str += ',';
    arg_str += args[i].type;
  }
  if (args.length === 0)
    arg_str = 'void';
  if (!(arg_str in method)) // check for dynamic here
    throw "Method '"+m+"' for the type '"+self.type+"' is not defined to act on types ("+arg_str+")";
  // for (kw in kwargs)
  // 	if (kwargs.hasOwnProperty(kw) && !(kw in method[0] && kwargs[kw].type === method[0][kw]))
  // 		throw "Unexpected keyword argument '"+kw+"' of type '"+kwargs[kw].type+"' for method '"+m+"' of type '"+self.type+"'";
  return method[arg_str];
};


// optional positional args should be translated to N+1 function signatures at compile time, where N is the number of optional positionals

// methods = {
// 	to_string: function (self) { return self.type + ' : ' + self.value; }
// 	concat: {
// 		0: { // for kwargs
// 			blah: 'bool'
// 		},
// 		"string":  function (self, args, kwargs) {
// 				return new TrObject('string', self.value + args[0].value, true);
// 			}
// 		},
//		"Array<string>": ...
// 	}
// }

var TrStruct = function (members, defaults, ops, methods) {
	this.ops = ops;  // (needs to extends basic ops [like ?])
	this.methods = methods; // (needs to extend basic methods [like to_string()])
	this.members = members;
	this.defaults = defaults || {};
        this.is_primitive = false;
};
TrStruct.prototype = new TrType();
TrStruct.prototype.constructor = TrStruct;
TrStruct.prototype.validate = function (members) {
	for (m in members) {
		if (members.hasOwnProperty(m) && !(m in this.members))
			throw "Invalid members for struct.";
	}
	for (m in this.members) {
		if (this.members.hasOwnProperty(m) && !(m in members))
			throw "Invalid members for struct.";
	}
};
// members needs to be a dict from prop name -> reference where prop value lives in global memory

module.exports.TrObject = TrObject;
module.exports.TrType = TrType;
module.exports.TrStruct = TrStruct;
module.exports.TrFunction = TrFunction;
module.exports.TrInlineFunction = TrInlineFunction;
