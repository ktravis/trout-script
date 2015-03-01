var utils = require('./utils');
var check_types = utils.check_types;
var extend = utils.extend;
var types = require('./types');
var tr = require('./runtime');
var objects = require('./objects');
var base = "var tr = require(\'./runtime\');"
          +"var _obj = require(\'./objects\');\n"
          +"var TrObject = _obj.TrObject;\n"
          +"var TrFunction = _obj.TrFunction;\n"
          +"var TrInlineFunction = _obj.TrInlineFunction;\n"
          +"var runtime = new tr.TrRuntime();\n"
          +"runtime.push_scope();\n"
          +"var _types = require('./types');\n"
          +"_types.tr_setup_primitives(runtime);\n"
          +"_types.tr_setup_std_types(runtime);\n"
          +"_types.tr_setup_functions(runtime);\n";
var base_end = "runtime.pop_scope();";

function Scope (parent, captures) {
  this.vars = {};
  //if (this.parent !== null)
    //for (v in this.parent.vars)
      //if (this.parent.vars.hasOwnProperty(v))
        //this.vars[v] = parent.get_var(v);
  this.parent = parent;
  this.root = this.parent === null;
  this.mode = "normal";
}
Scope.prototype.get_var = function (name) {
  if (name in this.vars)
    return this.vars[name];
  if (this.root)
    return null;
  return this.parent.get_var(name);
};

function Compiler () {
  this.indent = 0;
  this.line_no = 0;
  this.column = 0;
  this.primitives = types.tr_primitives;
  this.std_functions = types.tr_std_functions;
  this.out = "";
  this.scope_str = "runtime.current_scope";

  this.scope_stack = [];
  this.mode_stack = [];
  this.current_scope = null;
  this.return_state = "dynamic";
}
Compiler.prototype.in_mode = function (type) {
  for (var i = 0; i < this.mode_stack.length; i++)
    if (this.mode_stack[i] === type)
      return true;
  return false;
}
Compiler.prototype.push_scope = function () {
  this.scope_stack.push(new Scope((this.scope_stack.length === 0 ? null : this.scope_stack[this.scope_stack.length-1])));
  this.current_scope = this.scope_stack[this.scope_stack.length-1];
  // this.indent++;
};
Compiler.prototype.pop_scope = function () {
  this.scope_stack.pop();
  this.current_scope = this.scope_stack[this.scope_stack.length-1];
  // this.indent--;
}
Compiler.prototype.compile = function (ast) {
  this.out += base;
  this.push_scope(null);
  this.mode_stack.push('normal');
  this.current_scope.vars = extend(this.current_scope.vars, this.std_functions);
  for (var i = 0; i < ast.length; i++)
    this.write_line(this.resolve_node(ast[i]).str);
  this.out += base_end;
  return this.out;
};
Compiler.prototype.write_line = function(line) {
  this.out += this.get_statement_string(line);
};
Compiler.prototype.get_statement_string = function (line_str, line_ending) {
  var out = '';
  if (line_str === undefined || line_str.length < 1)
    return out;
  for (var i = 0; i < this.indent; i++)
    out += '  ';
  out += line_str + (line_ending !== false ? ';' : '') + '\n';
  return out;
}
Compiler.prototype.has_local = function (name) {
  return (name in this.current_scope.vars);
}
Compiler.prototype.get_var = function (name) {
  return this.current_scope.get_var(name);
};
Compiler.prototype.get_type = function (type_name) {
  type_name = utils.clean_type(type_name);
  _t = type_name
  if (type_name in this.primitives)
    return this.primitives[type_name];
  var t = this.current_scope.get_var(type_name);
  if (t === null)
    this.fail("Unknown type \'"+_t+"\'.");
  return t;
};
Compiler.prototype.fail = function (msg) {
  var e = new Error("line "+this.line_no+": "+msg);
  e.name = "CompilerError";
  throw e;
};

function Node (str, type, orig, deps) {
  return {
    str: str, type: type, orig: orig, dependencies: ((deps !== undefined && deps !== null) ? deps : [])
  };
}

var jit_compile = function (ast, runtime) {
  if (runtime === undefined) {
    runtime = new tr.TrRuntime();
    runtime.push_scope();
    types.tr_setup_primitives(runtime);
  }
};

//IndexTroutOfBoundsException
//Troutibute error
//IOError = InputTroutputError

// need to detect operations on uninitialized variables, simple as list of scope uninit?
Compiler.prototype.resolve_node = function (node) {
  if (node['line'] !== undefined)
		this.line_no = node['line'];
  var output;
  switch(node._type) {
    case "literal": output = this.resolve_literal(node); break;

    case "value declaration":
    case "declaration":
    case "inferred declaration": output = this.resolve_declaration(node); break;

    case "variable": output = this.resolve_variable(node); break;
    case "reference": output = this.resolve_reference(node); break;

    case "struct declaration": output = this.resolve_struct_declaration(node); break;
    // case "type declaration": output += ; break;

    case "member": output = this.resolve_member(node); break;
    // case "new": output += ; break;
    case "call": output = this.resolve_call(node); break;

    case "postfix operator": 
    case "unary operator":
    case "binary operator": output = this.resolve_operation(node); break;

    case "assignment": output = this.resolve_assignment(node); break;

    case "inline function": 
    case "inferred inline function": output = this.resolve_inline_fn(node); break;
    case "inferred anonymous block function":
    case "anonymous block function":
    case "inferred function declaration":
    case "function declaration": output = this.resolve_function_declaration(node); break;

    case "capture block":
    case "non capture block":
    case "block": output = this.resolve_block(node); break;

    // case "typed parameter": output += ; break;
    // case "function type": output += ; break;
    // case "type": output += ; break;
    // case "parameter": output += ; break;

    case "return": 
      var val = node.expr !== undefined ? this.resolve_node(node.expr) : null;
      var t = val === null ? 'void' : val.type;
      if (!this.in_mode('function'))
        this.fail('Return statement outside of function body.');
      else if (this.return_state !== 'dynamic' && t !== this.return_state)
        this.fail('Return statement does not match function definition.');
      this.return_state = t;
      var str = '';
      if (val !== null)
        str += this.get_statement_string('var _ret_val = '+val.str);
      if (this.in_mode('loop')) {
        str += this.get_statement_string('runtime.pop_scope()');
      }
      str += this.get_statement_string('return'+(val !== null ? ' _ret_val' : ''));
      output = Node(str, t, node, val === null ? [] : val.dependencies); break;
    case "continue":
      if (!this.in_mode('loop'))
        this.fail('Continue statement outside of a loop.');
      var str = '';
      str += this.get_statement_string('runtime.pop_scope()');
      str += this.get_statement_string('continue');
      output = Node(str,'continue',node); break;
    case "break":
      if (!this.in_mode('loop'))
        this.fail('Break statement outside of a loop.');
      var str = '';
      str += this.get_statement_string('runtime.pop_scope()');
      str += this.get_statement_string('break');
      output = Node(str,'break',node); break;
    // case "defer": output += ; break;

    case "if statement": output = this.resolve_if_statement(node); break;
    case "inferred loop statement":
    case "simple loop statement":
    case "conditional loop statement":
    case "loop statement": output = this.resolve_loop(node); break;
  };
  return output;
};
Compiler.prototype.resolve_loop = function (node) {
  var old = this.scope_str;
  this.push_scope();
  this.current_scope.mode = 'loop';
  this.mode_stack.push('loop');

  var block = this.resolve_node(node.block);

  this.pop_scope();
  this.mode_stack.pop();

  var str = '';
  if (node._type === 'simple loop statement') {
    str += this.get_statement_string('while(true){',false);
  } else if (node._type === 'conditional loop statement') {
    var cond = this.resolve_node(node.cond);
    if (cond.type !== 'bool') {
      this.line_no = node.line;
      this.fail('Loop condition is not a boolean expression or an iteration statement.');
    }
    str += this.get_statement_string('while('+cond.str+'.value === runtime._true.value){',false);
  }
  str += this.get_statement_string('runtime.push_scope()');
  str += block.str;
  str += this.get_statement_string('runtime.pop_scope()');
  str += this.get_statement_string('}',false);
  return Node(str, 'void', node, block.dependencies);
};
Compiler.prototype.resolve_inline_fn = function (node) {
  var argnames = '[';
  var argtypes = '[';
  var type_str = 'fn(';
  var args = {};

  var old = this.scope_str;
  this.push_scope();
  this.current_scope.mode = 'function';
  this.mode_stack.push('function');
  this.scope_str = 'scope';

  for (var i = 0; i < node.params.length; i++) {
    var store = {};
    store.const = false;
    store.type = node.params[i].type.name;
    if (node.params[i].type._type !== 'function type')
      this.get_type(store.type);
    else {
      store.returns = node.params[i].type.returns.name;
      store.args = [];
      for (var j = 0; j < node.params[i].type.params.length; j++) {
        store.args.push(node.params[i].type.params[j].name);
      }
    }
    args[node.params[i].name] = store.type;
    this.current_scope.vars[node.params[i].name] = store;
    argnames += "\'"+node.params[i].name+"\'";
    argtypes += "\'"+store.type+"\'";
    type_str += store.type;
    if (i !== node.params.length-1) {
      argnames += ','
      argtypes += ',';
      type_str += ',';
    }
  }
  argnames += "]";
  argtypes += "]";

  var expr = this.resolve_node(node.returns);
  this.scope_str = old;
  this.pop_scope();
  this.mode_stack.pop();

  var return_type = undefined;
  if (node._type === 'inline function') {
    return_type = node.return_type.name;
    if (!check_types(expr.type,return_type))
      this.fail("Inline function has declared return type of \'"+return_type+"\" but returns expression with type \'"+expr.type+"\'.");	
  } else if (node._type === 'inferred inline function') {
    return_type = expr.type;
  }
  type_str += ')' + return_type;
  var deps = expr.dependencies.filter(function (v) { return !args.hasOwnProperty(v); });
  var deps_string = "";
  if (deps.length === 0)
    deps_string = "[]";
  else 
    deps_string = "[\'" + deps.join("\',\'") + "\']";
  return Node("runtime.create_function("+argnames+", "+argtypes+", \'"+return_type+"\', "+deps_string+", function (scope) { return "+expr.str+"; })", type_str, node, deps);
};
Compiler.prototype.resolve_function_declaration = function (node) {
  var argnames = '[';
  var argtypes = '[';
  var type_str = 'fn(';
  var args = {};

  var old = this.scope_str;
  this.push_scope();
  this.current_scope.mode = 'function';
  this.mode_stack.push('function');
  this.scope_str = 'scope';

  this.return_state = 'dynamic';

  for (var i = 0; i < node.params.length; i++) {
    var store = {};
    var n = node.params[i];
    store.const = false;
    store.type = n.type.name;
    if (n.type._type !== 'function type')
      this.get_type(store.type);
    else {
      store.returns = n.type.returns.name;
      store.args = [];
      for (var j = 0; j < n.type.params.length; j++) {
        store.args.push(n.type.params[j].name);
      }
    }
    args[n.name] = store.type;
    this.current_scope.vars[n.name] = store;
    argnames += "'"+n.name+"'";
    argtypes += "'"+store.type+"'";
    type_str += store.type;
    if (i !== node.params.length-1) {
      argnames += ','
      argtypes += ',';
      type_str += ',';
    }
  }
  argnames += "]";
  argtypes += "]";

  var block = this.resolve_node(node.block);
  this.scope_str = old;
  this.pop_scope();
  this.mode_stack.pop();

  var return_type = undefined;
  if (node._type.indexOf('inferred') !== -1) {
    return_type = block.type;
  } else {
    return_type = node.return_type.name;
    if (!check_types(block.type,return_type))
      this.fail("Function has declared return type of \'"+return_type+"\' but returns expression with type \'"+block.type+"\'.");	
  }
  type_str += ')' + return_type;
  var deps = block.dependencies.filter(function (v) { return !args.hasOwnProperty(v); });
  if (deps.length === 0)
    deps = "[]";
  else 
    deps = "[\'" + deps.join("\',\'") + "\']";

  var str = '';

  if (node._type.indexOf("anonymous") === -1) {
    var store = {type: type_str, returns: return_type, args: utils.parse_fn_type(type_str).args};
    this.current_scope.vars[node.name] = store;
    str = this.get_statement_string(this.scope_str+".declare(\'"+node.name+"\',\'"+type_str+"\',false)");
    str += this.get_statement_string(this.scope_str+".assign_by_name(\'"+node.name+"\',runtime.create_function("+argnames+", "+argtypes+", \'"+return_type+"\', "+deps+", function (scope) {\n"+block.str+"}))");
  } else
    str = "runtime.create_function("+argnames+", "+argtypes+", \'"+return_type+"\', "+deps+", function (scope) {\n"+block.str+"})";
  return Node(str, type_str, node, deps);
};
Compiler.prototype.resolve_block = function (node) {
  // maybe this should push scope. If independent blocks are allowed syntactically, they should create a new scope
  var statements = node.statements;
  if (node._type !== 'block')
    statements = node.body.statements;
  var deps = [];
  var declares = {};
  var return_type = 'dynamic'
  var str = '';
  var return_reached = false;
  for (var i = 0; i < statements.length; i++) {
    if (statements[i]._type.indexOf('decl') !== -1)
      declares[statements[i].name] = true;
    var s = this.resolve_node(statements[i]);
    if (return_reached)
      this.fail('Unreachable code after return in function body');
    str += this.get_statement_string(s.str);
    if (statements[i]._type === 'return') {
      return_type = s.type;
      return_reached = true;
    }
    deps = deps.concat(s.dependencies.filter(function (v) {
      return !(v in declares);
    }));
  }
  var seen = {};
  deps = deps.filter(function (d) {
    var s = (d in seen);
    seen[d] = true;
    return !s;
  });
  return Node(str, return_type, node, deps);
};
Compiler.prototype.resolve_literal = function (node) {
  var str = '';
  switch(node.type) {
    case "string": str = "new TrObject(\'string\', \'"+node.value+"\')"; break;
    case "int": str = "new TrObject(\'int\', "+node.value+")"; break;
    case "float": str = "new TrObject(\'float\', "+node.value+")"; break;
    case "bool":
      if (node.value === true) {
        str = "runtime._true"; break;
      } else if (node.value === false) { 
        str = "runtime._false"; break;
      } else {
        this.fail("Invalid literal of type \'bool\': "+node);
      };
    case "dynamic": str = "runtime._null"; break;
    default: this.fail("Unknown literal type: "+node); 
  };
  return Node(str, node.type, node);
};

Compiler.prototype.resolve_operation = function (node) {
  // is operation defined
  if (node._type === "binary operator") {
    var left = this.resolve_node(node.left);
    var right = this.resolve_node(node.right);
    var lt = this.get_type(left.type);
    var rt = utils.clean_type(right.type);

    if (!(node.op in lt.ops))
      this.fail("The operator \'"+node.op+"\' is not defined for the type \'"+left.type+"\'.");
    var fn = lt.ops[node.op][rt] || lt.ops[node.op]['dynamic'];
    if (right._type !== 'literal')
      right.str += '.copy()';
    if (left._type !== 'literal')
      left.str += '.copy()';
    if (fn === undefined)
      this.fail("The operator \'"+node.op+"\' of type \'"+left.type+"\' is not defined to act on type \'"+rt+"\'.");
    return Node(this.scope_str+".call_operator("+left.str+",\'"+node.op+"\',["+right.str+"])", 
    						fn.returns, node, left.dependencies.concat(right.dependencies));
  } else if (node._type === 'postfix operator') { // what about when on is const?
    var on = this.resolve_node(node.expr);
    var t = this.get_type(on.type);
    
    var op = '_'+node.op;
    if (!(op in t.ops))
      this.fail("The operator \'"+op+"\' is not defined for the type \'"+t+"\'.");
    var fn = t.ops[op]['void'];
    return Node(this.scope_str+".call_operator("+on.str+",\'"+op+"\',[])", fn.returns, node, on.dependencies);
  } else { // unary 
    var on = this.resolve_node(node.expr);
    var t = this.get_type(on.type);

    var op = node.op+'_';
    if (!(op in t.ops))
      this.fail("The operator \'"+op+"\' is not defined for the type \'"+t+"\'.");
    var fn = t.ops[op]['void'];
    return Node(this.scope_str+".call_operator("+on.str+",\'"+op+"\',[])", fn.returns, node, on.dependencies);
  }
};

Compiler.prototype.resolve_variable = function(node) {
  if (this.has_local(node.name))
    return Node(this.scope_str+".get_value_absolute(\'"+node.name+"\')", this.get_var(node.name).type, node, [node.name]);
  else {
    var v = this.get_var(node.name);
    // make v const ?
    if (v === null)
      this.fail("Undeclared variable \'"+node.name+"\' encountered.");
    return Node(this.scope_str+".get_value_absolute(\'"+node.name+"\')", v.type, node, [node.name]);
  }
};
Compiler.prototype.resolve_reference = function(node) {
  // TODO: this doesn't handle member stuff yet
  //   maybe add an argument that specifies we want address and not value
  var of = this.resolve_node(node.of);
  var t = '&'+of.type;
  return Node("new TrObject(\'"+t+"\', "+this.scope_str+".get_address(\'"+node.of.name+"\'))", t, node, node.of.dependencies);
};
Compiler.prototype.resolve_call = function(node) {
  var args = [];
  var deps = [];
  for (var i = 0; i < node.args.length; i++) {
    args.push(this.resolve_node(node.args[i]));
    deps = deps.concat(args[i].dependencies);
  }
  
  var callee = this.resolve_node(node.fn); //this.get_var(node.fn.name);
  
  if (!utils.type_is_function(callee.type))
    this.fail("Variable \'"+node.fn+"\' is not a function, its type is \'"+callee.type+"\'.");
  
  var callee_fn_type = utils.parse_fn_type(callee.type);
  
  deps = deps.concat(callee.dependencies);

  var arg_str = [];
  for (var i = 0; i < args.length; i++) {
    if (!check_types(callee_fn_type.args[i],args[i].type))
      this.fail("Type mismatch between function \'"+callee+"\' parameter "+i+" of type \'"+callee_fn_type.args[i]+"\' and supplied argument of type \'"+args[i].type+"\'.");
    //else if (!utils.type_is_reference(args[i].type) && args[i].orig._type !== 'literal')
      //arg_str.push(args[i].str); // TODO not sure about this
    else if (args._type === 'literal')
      arg_str.push(args[i].str);
    else
      arg_str.push(args[i].str + ".copy()");
  }
  arg_str = "[" + arg_str.join(',') + "]";
  return Node(callee.str+".call_function("+arg_str+")", callee_fn_type.returns, node, deps);
};
Compiler.prototype.resolve_assignment = function(node) {
  var lhs = this.resolve_node(node.lhs);
  var rhs = this.resolve_node(node.rhs);
  
  if (node.op !== '=') {
    rhs = this.resolve_node({
      _type:'binary operator', 
      op: node.op.substring(0,node.op.length-1),
      left: node.lhs,
      right: node.rhs
    });
  }
  if (!check_types(lhs.type, rhs.type))
    this.fail("Assignment of type \'"+rhs.type+"\' to variable \'"+lhs.orig.name+"\' of type \'"+lhs.type+"\'.");
  var str = '';
  if (node.lhs._type === 'member') {
    var of = this.resolve_node(node.lhs.of);
    str += this.scope_str+".assign_member("+of.str+",\'"+node.lhs.property+"\',"+rhs.str+")";
  } else {
    if (this.get_var(node.lhs.name).const)
      this.fail("Reassignment of constant variable '"+node.lhs.name+"'.");
    str += this.scope_str+".assign_by_name(\'"+lhs.orig.name+"\',"+rhs.str+")";
  }
  return Node(str, rhs.type, node, rhs.dependencies);
};
Compiler.prototype.resolve_declaration = function(node) {
  if (this.has_local(node.name))
    this.fail("Second declaration of variable \'"+node.name+"\'.");

  if (node.const && node._type === 'declaration')
    this.fail("Const declaration of variable \'"+node.name+"\' without a value is not allowed.");

  var store = {};
  var val = null;
  var val_type = null;
  var deps = [];
  if (node._type !== 'declaration') {
    val = this.resolve_node(node.value);
    val_type = val.type;
    deps = deps.concat(val.dependencies);
  }
  var type = node.type !== undefined ? node.type.name : val_type;

  if (node._type === "value declaration" && !check_types(type, val_type))
    this.fail("Type mismatch between declared type \'"+type+"\' of variable \'"+node.name+"\' and value assigned, type \'"+val.type+"\'.");
  store.type = type;
  store.const = node.const;

  if (utils.type_is_function(type)) { // it's a function
    var tmp = utils.parse_fn_type(type);
    store.returns = tmp.returns;
    store.args = tmp.args;
  } else
    this.get_type(type);
  this.current_scope.vars[node.name] = store;

  if (node._type === "declaration")
    return Node(this.scope_str+".declare(\'"+node.name+"\',\'"+type+"\',false)", type, node, deps);
  else if (node.const) {
    var str = this.get_statement_string(this.scope_str+".declare_with_object(\'"+node.name+"\',"+val.str+",true)");
    return Node(str, type, node, deps);
  } else {
    var str = this.get_statement_string(this.scope_str+".declare(\'"+node.name+"\',\'"+type+"\', false)");
    str += this.get_statement_string(this.scope_str+".assign_by_name(\'"+node.name+"\',"+val.str+")");
    return Node(str, type, node, deps);
  }
};
Compiler.prototype.resolve_if_statement = function (node) {
  var cond = this.resolve_node(node.expr);
  if (cond.type !== "bool")
    this.fail("Conditional expression in if statement does not evaluate to a boolean value");
  var block = this.resolve_node(node.block);
  var deps = block.dependencies.concat(cond.dependencies);
  var str = "if ("+cond.str+".value === runtime._true.value) {\n";
  str += block.str;
  str += "}";

  for (var i = 0; i < node.else_if_statements.length; i++) {
    var econd = this.resolve_node(node.else_if_statements[i].expr);
    if (econd.type !== 'bool')
      this.fail("Conditional expression in else if statement does not evaluate to a boolean value");
    var b = this.resolve_node(node.else_if_statements[i].block);
    deps = deps.concat(b.dependencies.concat(econd.dependencies));
    str += "else if ("+econd.str+".value === runtime._true.value) {\n";
    str += b.str;
    str += "}";
  }
  if (node.else_statement !== null) {
    var b = this.resolve_node(node.else_statement.block);
    str += "else {\n" + b.str + "}";	
  }

  return Node(str, block.type, node, deps);
};
Compiler.prototype.resolve_struct_declaration = function (node) {
  if (this.has_local(node.name))
    this.fail("Second declaration of variable with name \'"+node.name+"\'.");
  var temp = {type: "type", "const": true};
  temp = extend(temp, types.tr_primitives.dynamic);
  this.current_scope.vars[node.name] = temp;
  var members = {};
  var defaults = "{";
  var deps = [];
  for (var i = 0; i < node.members.length; i++) {
    var m = node.members[i];

    // TODO: some kind of type check here?
    members[m.name] = m.type.name;
    if (m._type === "default member") {
      var v = this.resolve_node(m.value);
      if (!check_types(v.type, m.type.name))
        this.fail("Default expression for member \'"+m.name+"\' of declared type \'"+m.type.name+"\' does not match default expression with type \'"+v.type+"\'.");
      defaults += "\'" + m.name + "\':" + v.str + ",";
      deps = deps.concat(v.dependencies);
    }
  } 
  defaults += "}";
  this.get_type(node.name).members = members;
  return Node(this.scope_str+".declare_struct(\'"+node.name+"\', "+JSON.stringify(members)+", "+defaults+")", 'type', node, deps);
};
Compiler.prototype.resolve_member = function (node) {
  var of = this.resolve_node(node.of);
  var t = this.get_type(of.type);
  if (!t.members.hasOwnProperty(node.property))
    this.fail("Type \'"+of.type+"\' has no member \'"+node.property+"\'.");
  return Node(this.scope_str+".get_member("+of.str+",\'"+node.property+"\')", t.members[node.property], node, of.dependencies);
};

module.exports = Compiler;
