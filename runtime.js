var utils = require('./utils');
var tr_objects = require('./objects');
var types = require('./types');
var Set = utils.Set;


var TrVariable = function(loc,type,constant) {
  this.loc = loc;
  this.type = type;
  this.const = constant === true ? constant : false;
}

var TrScope = function(memory, parent) {
  this.parent = parent;
  this.memory = memory;
  this.root = (this.parent === null || this.parent === undefined);
  this.variables = {}; // map of name:string -> variable:TrVariable
  this.declared = new Set();
  this.all_variables = new Set();

  if (!this.root) {
    for (n in parent.variables) {
      if (parent.variables.hasOwnProperty(n)) {
        this.variables[n] = new TrVariable(parent.get_address(n),parent.variables[n].type,false);
        this.all_variables.push(n);
      }
    }
  }
};

// allocate a new variable slot in global memory with type, and metadata
TrScope.prototype.allocate = function (type, value, constant) {
  constant = constant === true;
  value = value !== undefined ? value : this.memory._null.value;
  var ref = this.memory.last;
  this.memory.last++;
  var v = new tr_objects.TrObject(type, value);
  v.const = constant;
  this.memory[ref] = v;
  return ref;
};
TrScope.prototype.allocate_object = function (obj) {
  var ref = this.memory.last;
  this.memory.last++;
  this.memory[ref] = obj;
  return ref;
};
TrScope.prototype.allocate_struct = function (type, vals, constant) {
  var struct = this.get_value_absolute(type);
  var constant = constant === true;
  vals = vals || {};
  if (!struct.hasOwnProperty('members'))
    utils.fail("The name '"+type+"' is not declared as a struct.");
  var store = {};

  for (member in struct.members) {
    if (!struct.members.hasOwnProperty(member))
      continue;
    if (vals.hasOwnProperty(member)) {
      store[member] = this.allocate(vals[member], null);
    } else if (struct.defaults.hasOwnProperty(member)) {
      store[member] = this.allocate_object(struct.defaults[member].value); // not sure if allocate or _with_value
    } else
      store[member] = this.allocate(struct.members[member], null);
  }
  return this.allocate(type, store, constant);
};
TrScope.prototype.declare = function (name, type, constant) {
  if (this.declared.contains(name))
    utils.fail("Double declaration of variable named '"+name+"' in current scope.");
  constant = constant === true;
  var ref;
  if (utils.type_is_function(type) ||
      this.get_value_absolute(utils.clean_type(type)).is_primitive) {
    ref = this.allocate(type, null, constant);
  } else {
    ref = this.allocate_struct(type, false, constant);    
  }
  this.variables[name] = new TrVariable(ref, type, constant);
  this.all_variables.push(name);
  this.declared.push(name);
};
TrScope.prototype.declare_with_value = function (name, value, type, constant) {
  if (this.declared.contains(name))
    utils.fail("Double declaration of variable named '"+name+"' in current scope.");
  constant = constant === true;
  var ref;
  if (utils.type_is_function(type) ||
      this.get_value_absolute(utils.clean_type(type)).is_primitive) {
    ref = this.allocate(type, value, constant);
  } else {
    ref = this.allocate_struct(type, value, constant);    
  }
  this.variables[name] = new TrVariable(ref, type, constant);
  this.all_variables.push(name);
  this.declared.push(name);
};
TrScope.prototype.declare_with_object = function (name, obj, constant) {
  constant = constant === true;
  if (this.declared.contains(name))
    utils.fail("Double declaration of variable named '"+name+"' in current scope.");
  var ref = this.allocate_object(obj);
  this.variables[name] = new TrVariable(ref, obj.type, constant);
  this.all_variables.push(name);
  this.declared.push(name);
};
TrScope.prototype.declare_struct = function (name, members, defaults) {
  defaults = defaults || {};
  if (this.declared.contains(name))
    utils.fail("The type '"+name+"' is already declared in this scope.");
  var v = new tr_objects.TrStruct(members, defaults, types.tr_primitives.dynamic.ops, types.tr_primitives.dynamic.methods);

  var ref = this.memory.last;
  this.memory[ref] = v;
  this.memory.last += 1;

  this.declare_with_value(name, ref, '&type', true);
};
TrScope.prototype.declare_type = function (name, ops, methods) {
  ops = ops || {};
  methods = methods || {};
  if (this.declared.contains(name))
    utils.fail("The type \'"+name+"\' is already declared in this scope.");
  var v = new tr_objects.TrType(ops, methods);
  var loc = this.memory.last;
  this.memory[loc] = v;
  this.memory.last += 1;

  var ref = this.allocate('&type', loc, true);
  this.variables[name] = new TrVariable(ref, '&type', true);
  this.all_variables.push(name);
  this.declared.push(name);
};

TrScope.prototype.assign_by_name = function (name, obj) {
  var v = this.variables[name];
  if (v.const && v.loc !== 0)
    utils.fail("Invalid assignment of const variable "+name);
  this.memory[v.loc] = obj;
};
TrScope.prototype.assign_by_address = function (address, obj) {
  this.memory[address] = obj;
};

TrScope.prototype.get_value = function (name) {
  var v = this.variables[name];
  if (v === undefined)
    utils.fail("No variable in current scope named '"+name+"'.");
  return this.memory[v.loc];
};

TrScope.prototype.get_value_absolute = function (name) {
  var v = this.variables[name];
  if (v === undefined)
    utils.fail("No variable in current scope named '"+name+"'.");
  var val = this.memory[v.loc];
  while (val.is_reference) {
    val = this.memory[val.value];
  }
  return val;
};

TrScope.prototype.get_value_by_reference = function (address) {
  return this.memory[address];
};

TrScope.prototype.get_value_absolute_by_reference = function (address) {
  var val = this.memory[address];
  while (val.is_reference) {
    val = this.memory[v.value];
  }
  return val;
};

TrScope.prototype.get_address = function (name) {
  var v = this.variables[name];
  if (v === undefined)
    utils.fail("No variable in current scope named '"+name+"'.");
  return v.loc;
};

TrScope.prototype.get_member = function (of, member) {
  if (!of.value.hasOwnProperty(member))
    utils.fail("Variable of type '"+of.type+"' has no member '"+member+"'.");
  return this.get_value_absolute_by_reference(of.value[member]);
};

TrScope.prototype.assign_member = function (of, member, obj) {
  if (!of.value.hasOwnProperty(member))
    utils.fail("Variable of type '"+of.type+"' has no member '"+member+"'.");
  this.assign_by_address(of.value[member], obj);
};

TrScope.prototype.call_function = function (name, args) {
  return this.get_value_absolute(name).call_function(args);
};

TrScope.prototype.call_operator = function (obj, op, args) {
  return this.get_value_absolute(obj.type).get_operator(op, obj, args).call_function(null, [obj].concat(args));
};

TrScope.prototype.call_method = function (obj, m, args, kwargs) {
  return this.get_value_absolute(obj.type).get_method(m, obj, args, kwargs)(obj, args, kwargs); // this needs to be a .call_function with a runtime arg
};

TrScope.prototype.copy = function (name) {
  if (!this.has_variable(name))
    utils.fail("Variable '"+name+"' is not defined.");
  var v = this.get_value_absolute(name);
  return this.copy_by_reference(v.loc);
};
TrScope.prototype.copy_by_reference = function (address) {
  if (address === 0)
    return 0;
  var v = this.get_value_absolute_by_reference(address);
  var t = this.get_value_absolute(utils.clean_type(v.type));
  var value = v.value;
  if (!t.is_primitive) {
    for (a in value) {
      if (value.hasOwnProperty(a))
        value[a] = this.copy_by_reference(a);
    } 
  }
  return this.allocate(v.type, value, v.const);
};
TrScope.prototype.has_variable = function (name) {
  return this.all_variables.contains(name);	
};
TrScope.prototype.delete = function (name) {
  if (!this.has_variable(name))
    utils.fail("Variable '"+name+"' is not defined.");
  var loc = this.variables[name].loc;
  this.memory[loc].delete();
  this.memory[loc] = undefined;
  this.variables[name] = undefined;
  this.all_variables.remove(name);
  this.declared.remove(name);
}
TrScope.prototype.close_over = function (name) {
  this.get_value_absolute(name).ref_count++;
};
TrScope.prototype.get_type_of = function (name) {
  if (this.has_variable(name))
    return this.get_value(name).type;
  utils.fail("Variable '"+name+"' is not defined.");
};
TrScope.prototype.teardown = function () {
  while (this.all_variables.length > 0) { // should I be looping through declared here?
    var v = this.all_variables.pop();
    
    if (--this.get_value_absolute(v).ref_count < 1 && this.declared.contains(v))
      this.delete(v);
  }
};

var TrRuntime = function () {
  this.scope_stack = [];
  this._null = new tr_objects.TrObject('dynamic', null, true);
  this.memory_blocks = {last: 1, 0: this._null};
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

TrRuntime.prototype.create_function = function (argnames, argtypes, returns, encloses, body) {
  var s = new TrScope(this.memory_blocks, this.current_scope);
  for (var i = 0; i < encloses.length; i++) {
    s.close_over(encloses[i]);
  }
  return new tr_objects.TrFunction(this, argnames, argtypes, returns, s, body);
};

TrRuntime.prototype.declare_type = function (name, ops, methods) {
  this.current_scope.declare_type(name, ops, methods);
};

module.exports.TrScope = TrScope;
module.exports.TrRuntime = TrRuntime;
