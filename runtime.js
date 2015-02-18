var utils = require('./utils');
var tr_objects = require('./objects');
var types = require('./types');


var TrLocal = function(loc,type,constant) {
	this.loc = loc;
	this.type = type;
	this.const = constant === true ? constant : false;
}

var TrScope = function(memory, parent) {
	this.parent = parent;
	this.memory = memory;
	this.root = (this.parent === null || this.parent === undefined);
	this.locals = {}; // map of name:string -> variable:TrLocal
	this.declared = {}; // map of name:string -> owned:bool
	this.declared_list = [];
	this.encloses = {};

	if (!this.root) {
		for (n in parent.locals) {
			if (parent.locals.hasOwnProperty(n)) {
				this.locals[n] = new TrLocal(parent.get_reference(n),parent.locals[n].type,false);
			}
		}
	}
};
TrScope.prototype.allocate = function (type, value, constant) {
  var t = this.get_variable_absolute(type);
  constant = constant === true;
  value = value !== undefined ? value : this.memory._null.value;
  if (t.is_primitive) {
    return new tr_objects.TrObject(type, value);
  } else {
    return this.allocate_struct(type, value);
  }
};
TrScope.prototype.get_member = function (of, member) {
  if (!of.value.hasOwnProperty(member))
    throw "Variable of type '"+of.type+"' has no member '"+member+"'.";
  return this.memory[of.value[member]];
};
TrScope.prototype.set_member = function (of, member, val) {
  if (!of.value.hasOwnProperty(member))
    throw "Variable of type '"+of.type+"' has no member '"+member+"'.";
  this.memory[of.value[member]] = val;
  return val;
};
TrScope.prototype.call_function = function (name, args) {
	return this.get_variable(name).call_function(args);
};
TrScope.prototype.call_operator = function (obj, op, args) {
	return this.get_variable_absolute(obj.type).get_operator(op, obj, args).call_function(null, [obj].concat(args));
};
TrScope.prototype.call_method = function (obj, m, args, kwargs) {
	return this.lookup_type(obj.type).get_method(m, obj, args, kwargs)(obj, args, kwargs); // this needs to be a .call_function with a runtime arg
};
// call static?
TrScope.prototype.declare_const = function (name, variable) {
	if (name in this.declared)
		throw "Double declaration in the current scope of variable '"+name+"'.";
	this.locals[name] = new TrLocal(this.memory.last,variable.type,true);
	this.declared[name] = true;
	this.declared_list.push(name);
	variable.const = true;
	this.memory[this.memory.last] = variable;
	this.memory.last += 1;
};
TrScope.prototype.declare = function (name, type) {
	if (name in this.declared)
		throw "Double declaration in the current scope of variable '"+name+"'.";
	this.declared[name] = true;
	this.declared_list.push(name);
        if (!utils.type_is_function(type) && !utils.type_is_reference(type) && !this.get_variable_absolute(type).is_primitive) {
          var v = this.allocate_struct(type);
          this.memory[this.memory.last] = v;
        } else
          this.memory[this.memory.last] = this.memory._null;
	this.locals[name] = new TrLocal(this.memory.last,type);
	this.memory.last += 1;
};
TrScope.prototype.declare_type = function (name, ops, methods) {
	ops = ops || {};
	methods = methods || {};
	if (name in this.locals && name in this.declared)
		throw "The type '"+name+"' is already declared in this scope.";
	var v = new tr_objects.TrType(ops, methods);
	var ref = this.memory.last;
	this.memory[ref] = v;
	this.memory.last += 1;
	this.declare_const(name, new tr_objects.TrObject('&type', ref, true));
};
TrScope.prototype.declare_struct = function (name, members, defaults) {
  defaults = defaults || {};
  if (name in this.locals && name in this.declared)
    throw "The type '"+name+"' is already declared in this scope.";
  var v = new tr_objects.TrStruct(members, defaults, types.tr_primitives.dynamic.ops, types.tr_primitives.dynamic.methods);
  var ref = this.memory.last;
  this.memory[ref] = v;
  this.memory.last += 1;
  this.declare_const(name, new tr_objects.TrObject('&type', ref, true));
};
TrScope.prototype.allocate_struct = function (type, vals) {
  var struct = this.get_variable_absolute(type);
  if (!struct.hasOwnProperty('members'))
    throw "The name '"+type+"' is not declared as a struct.";
  var store = {};

  for (member in struct.members) {
    if (!struct.members.hasOwnProperty(member))
      continue;
    store[member] = this.memory.last;
    if (struct.defaults.hasOwnProperty(member)) {
      this.memory[this.memory.last] = this.allocate(struct.members[member], struct.defaults[member].value);
    }
    else
      this.memory[this.memory.last] = new tr_objects.TrObject(struct.members[member], null);//this.allocate(struct.members[member]);
    this.memory.last += 1;
  }
  return new tr_objects.TrObject(type, store);
};
// TrScope.prototype.declare_struct = function (name, members, defaults, ops, methods) {
// 	ops = ops || {};
// 	methods = methods || {};
// 	if (name in this.types)
// 		throw "The type '"+name+"' is already declared in this scope.";
// 	var v = new tr_objects.TrStruct(members, defaults, ops, methods);
// 	this.memory[this.memory.last] = v;
// 	this.types[name] = v;
// 	this.declare_const(name, '&type', this.memory.last);
// 	this.memory.last += 1;
// };
TrScope.prototype.assign = function (name, type, val) {
	if (!utils.check_types(this.locals[name].type,type))
		throw "Incompatible assignment of "+name+" ("+this.locals[name].type+
			") to "+val+" ("+type+")";
	if (this.locals[name].const)
		throw "Invalid assignment of const variable "+name;
	this.memory[this.locals[name].loc].value = val;
};
TrScope.prototype.assign_variable = function (name, variable) {
	if (!utils.check_types(this.locals[name].type, variable.type))
		throw "Incompatible assignment of "+name+" ("+this.locals[name].type+
			") to "+variable.value+" ("+variable.type+")";
	if (this.locals[name].const)
		throw "Invalid assignment of const variable "+name;
	this.memory[this.locals[name].loc] = variable;
};
TrScope.prototype.copy = function (name, constant) {
	if (!this.has_variable(name))
		throw "Variable '"+name+"' is not defined.";
	return this.memory[this.locals[name].loc].copy();
};
TrScope.prototype.has_variable = function (name) {
	return (this.locals[name] !== undefined);	
};
TrScope.prototype.delete = function (name) {
	if (!this.has_variable(name))
		throw "Variable '"+name+"' is not defined.";
	var loc = this.locals[name].loc;
	this.memory[loc].delete();
	this.memory[loc] = undefined;
	this.locals[name] = undefined;
	this.declared[name] = undefined;
	this.declared_list = [];
}
TrScope.prototype.get_variable_by_reference = function (ref) {
	if (ref < 0 || ref >= this.memory.last)
		throw "'+ref+' is an invalid memory location.";
	return this.memory[ref];
};
TrScope.prototype.get_type = function (name) {
	if (this.has_variable(name))
		return this.locals[name].type;
	throw "Variable '"+name+"' is not defined.";
};
TrScope.prototype.get_variable = function (name) {
	if (this.has_variable(name))
		return this.get_variable_by_reference(this.locals[name].loc);
	throw "Variable '"+name+"' is not defined.";
};
TrScope.prototype.get_reference = function (name) {
	if (this.has_variable(name))
		return this.locals[name].loc;
	throw "Variable '"+name+"' is not defined.";
};
TrScope.prototype.get_variable_absolute = function (name) {
	var v = this.get_variable(name);
	if (!v.is_reference) 
          return v;
	return this.get_variable_by_reference(v.value);
};
TrScope.prototype.close_over = function (name) {
	this.get_variable_absolute(name).enclosed_by += 1;
	this.encloses[name] = true;
};
TrScope.prototype.teardown = function () {
	//for (v in this.locals) {
	//for (v in this.declared) {
        while (this.declared_list.length > 0) {
          var v = this.declared_list.pop();
		if (this.encloses.hasOwnProperty(v)) {
			if (--this.get_variable_absolute(v).enclosed_by < 1)
				this.delete(v);
		} else
			this.delete(v);
	}
};

var TrRuntime = function () {
	this.scope_stack = [];
	this._null = new tr_objects.TrObject('dynamic', null, true);
	this.memory_blocks = {last: 0, _null: this._null};
	this.current_scope = null;
};
TrRuntime.prototype.push_scope = function (encloses, to_push) {
	var s = to_push;
	if (s === undefined || s === null) {
		if (this.current_scope === null)
			s = new TrScope(this.memory_blocks);
		else {
			s = new TrScope(this.memory_blocks, this.current_scope);
		}
	}
	this.scope_stack.push(s);
	if (encloses !== undefined && encloses !== null)
		for (var i = 0; i < encloses.length; i++)
			s.close_over(encloses[i]);
	this.current_scope = s;
};
TrRuntime.prototype.pop_scope = function (teardown) {
	if (teardown !== false)
		this.scope_stack.pop().teardown();
	this.current_scope = this.scope_stack[this.scope_stack.length-1];
};
TrRuntime.prototype.create_function = function (argnames, argtypes, returns, encloses, body) { // takes_over is an array of declarations from the parent scope that will have their ownership transferred
	var s = new TrScope(this.memory_blocks, this.current_scope);
	for (var i = 0; i < encloses.length; i++) {
		s.close_over(encloses[i]);
	}
	return new tr_objects.TrFunction(this, argnames, argtypes, returns, s, body);
};
TrRuntime.prototype.declare_type = function (name, ops, methods) {
	this.current_scope.declare_type(name, ops, methods);
};
TrRuntime.prototype.fail = function (reason) {
	throw new Error(reason);
};

module.exports.TrScope = TrScope;
module.exports.TrRuntime = TrRuntime;
