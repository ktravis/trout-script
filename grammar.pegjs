{
  // https://github.com/pegjs/pegjs/blob/master/examples/javascript.pegjs
  function buildTree(first, rest, builder) {
    var result = first, i;

    for (i = 0; i < rest.length; i++) {
      result = builder(result, rest[i]);
    }

    return result;
  }

  function buildBinaryExpression(first, rest) {
    return buildTree(first, rest, function(result, element) {
      return {
        _type:    "binary operator",
        op:       element[1],
        left:     result,
        right:    element[3]
      };
    });
  }
}

start = program

EOF = !.

EOL
  = "\n"
  / "\r\n"

ws = ([ \t] / single_line_comment EOL / multi_line_comment)+

ows = ([ \t] / single_line_comment / multi_line_comment)*

single_line_comment
  = "//" (!EOL .)*

// these don't nest but they should
multi_line_comment
  = "/*" (!"*/" .)* "*/"

string
  = '"' inner:[^\"\n\r]* '"' { return inner.join(''); }
  / "'" inner:[^\'\n\r]* "'" { return inner.join(''); }

float
  = pre:[0-9]* "." post:[0-9]+ { return parseFloat(pre.join("")+"."+post.join(""), 10); }

integer
  = [0-9]+

signed_integer
  = sign:[+-]? digits:integer { return parseInt((sign ? sign : '')+digits.join(""), 10); }

true = "true"
false = "false"
delete = "delete"
null = "null"
struct = "struct"
type = "type"
function = "fn"
return = "return"
const = "const"
new = "new"
in = "in"
if = "if"
else = "else"
loop = "loop"
void = "void"
dynamic = "dynamic"
defer = "defer"
do = "do"
yield = "yield"
var = "var"
break = "break"
continue = "continue"

reserved_base
  = true
  / false
  / null
  / struct
  / type
  / function
  / return
  / delete
  / const
  / in
  / if
  / else
  / break
  / continue
  / loop
  / defer
  / do
  / new
  / var
  / yield

reserved
  = reserved_base !id_base

typename
  = "int"
  / "float"
  / "string"
  / "dynamic"
  / "void"
  / "bool"

id_base
  = x:[_a-zA-Z$]+ { return x.join(''); }

identifier
  = !reserved first:id_base { return first; }

variable_name
  = !typename first:id_base { return first; }


program
  = s:statements EOF { return s; }

statements
  = ows (EOL ows)* first:statement ows (terminator ows)+ rest:statements { rest.unshift(first); return rest; }
  / ows (EOL ows)* first:statement ows { return [first]; }
  / ows { return []; }

terminator
  = EOL
  / ";"

statement
  = a:expression { a['line'] = line(); a['column'] = column(); return a; }
  / a:variable_declaration { a['line'] = line(); a['column'] = column(); return a; }
  / a:function_declaration { a['line'] = line(); a['column'] = column(); return a; }
  / a:struct_declaration { a['line'] = line(); a['column'] = column(); return a; }
  / a:type_declaration { a['line'] = line(); a['column'] = column(); return a; }
  / a:if_statement { a['line'] = line(); a['column'] = column(); return a; }
  / a:defer_statement { a['line'] = line(); a['column'] = column(); return a; }
  / a:loop_statement { a['line'] = line(); a['column'] = column(); return a; }
  / a:continue_statement { a['line'] = line(); a['column'] = column(); return a; }
  / a:break_statement { a['line'] = line(); a['column'] = column(); return a; }
  / a:return_statement { a['line'] = line(); a['column'] = column(); return a; }

expression
  = assignment_expression

primary_expression
  = "(" ows exp:expression ows ")" { return exp; }
  / inline_function
  / variable
  / reference
  / literal

literal
  = value:string { return {_type: 'literal', type: 'string', value: value } }
  / value:float { return {_type: 'literal', type: 'float', value: value } }
  / value:signed_integer { return {_type: 'literal', type: 'int', value: value } }
  / value:true { return {_type: 'literal', type: 'bool', value: true } }
  / value:false { return {_type: 'literal', type: 'bool', value: false } }
  / value:null { return {_type: 'literal', type: 'dynamic', value: null } }
  
variable_declaration
  = c:(const ws)? var ws name:variable_name ows ":" ows type:type_signature ows "=" ows value:expression { return {_type: 'value declaration', name: name, type: type, value: value, const:(c!==null) } }
  / var ws name:variable_name ows ":" ows type:type_signature { return {_type: 'declaration', name: name, type: type } }
  / c:(const ws)? var ws name:variable_name ows "=" ows value:expression { return {_type: 'inferred declaration', name: name, value:value, const:(c!==null) } }

variable
  = name:identifier  { return {_type: 'variable', name: name } }

struct_declaration
  = struct ws name:variable_name ows body:struct_definition_block { return {_type: 'struct declaration', name: name, members: body.members } }

struct_definition_block
  = "{" ows (EOL ows)* first:struct_definition_line rest:(ows ("," / EOL) (ows EOL)* ows x:struct_definition_line { return x; })* ows EOL* ows "}" { return { _type: 'struct_definition_block', members: [first].concat(rest) } }

struct_definition_line
  = name:variable_name ows ":" ows type:type_signature ows "=" ows value:expression { return { _type: "default member", name: name, type: type, value: value }}
  / name:variable_name ows ":" ows type:type_signature { return { _type: "member", name: name, type: type }}

type_declaration
  = type ws name:identifier ows "=" ows type:type_signature { return {_type: 'type declaration', name: name, type: type } }

reference
  = "&" expr:expression { return { _type:'reference', of: expr } }

member
  = first:(
      primary_expression
    / new ows callee:member ows "(" ows args:arguments ows ")" { 
        return {_type: "new", type: callee, args:args } }
    )
    rest:(
      ows "[" ows prop:expression ows "]" {
        return {property:prop,computed:true}; }
    / ows "." ows prop:identifier {
        return {property:prop,computed:false}; }
    )*
    { return buildTree(first, rest, function(result, element) {
        return {_type: "member", of:result, property:element.property,computed:element.computed} }) }

new_expression
  = member
  / new ws type:new_expression ows "(" ows args:arguments ows ")" { return { _type:'new', type:type, args:args } }


// this is still wrong, slightly
call_expression
  = first:(
      callee:member ows "(" ows args:arguments ows ")" { return {_type: "call", fn:callee, args:args} }
    )
    rest:(
      ows "(" ows args:arguments ows ")" { return {_type:"call",args:args} }
    / ows "[" ows prop:expression ows "]" { return {_type:"member", property:prop, computed: true}; }
    / ows "." ows prop:identifier { return {_type:"member", property:prop, computed:false } }
    )* { return buildTree(first, rest, function (result, element) { element[element._type === 'call' ? 'fn' : 'of'] = result; return element }); }


lhs_expression
  = call_expression
  / new_expression

postfix_expression
  = expr:lhs_expression ows op:postfix_operator { return { _type: 'postfix operator', expr:expr, op: op } }
  / lhs_expression

postfix_operator
  = "++"
  / "--"
  / "?"

unary_expression
  = postfix_expression
  / op:unary_operator ows expr:unary_expression { return { _type: 'unary operator', expr:expr, op: op } }

unary_operator
  = delete
  / "&"
  / "@"
  / "++"
  / "--"
  / $("+" !"=")
  / $("-" !"=")
  / "~"
  / "!"

multiplicative_expression
  = first:unary_expression rest:(ows multiplicative_operator ows unary_expression)* { return buildBinaryExpression(first, rest); }

multiplicative_operator
  = $("*" !"=")
  / $("/" !"=")
  / $("%" !"=")

additive_expression
  = first:multiplicative_expression rest:(ows additive_operator ows multiplicative_expression)* { return buildBinaryExpression(first, rest); }


additive_operator
  = $("+" ![+=])
  / $("-" ![-=])

shift_expression
  = first:additive_expression rest:(ows shift_operator ows additive_expression)* { return buildBinaryExpression(first, rest); }


shift_operator
  = $("<<" !"=")
  / $(">>>" !"=")
  / $(">>" !"=")

relational_expression
  = first:shift_expression rest:(ows relational_operator ows shift_expression)* { return buildBinaryExpression(first, rest); }


relational_operator
  = "<="
  / ">="
  / $("<" !"<")
  / $(">" !">")

equality_expression
  = first:relational_expression rest:(ows equality_operator ows relational_expression)* { return buildBinaryExpression(first, rest); }


equality_operator
  = "=="
  / "!="

bitwise_and_expression
  = first:equality_expression rest:(ows $("&" ![&=]) ows equality_expression)* { return buildBinaryExpression(first, rest); }


bitwise_xor_expression
  = first:bitwise_and_expression rest:(ows $("^" !"=") ows bitwise_and_expression)* { return buildBinaryExpression(first, rest); }


bitwise_or_expression
  = first:bitwise_xor_expression rest:(ows $("|" ![|=]) ows bitwise_xor_expression)* { return buildBinaryExpression(first, rest); }


logical_and_expression
  = first:bitwise_or_expression rest:(ows "&&" ows bitwise_or_expression)* { return buildBinaryExpression(first, rest); }


logical_or_expression
  = first:logical_and_expression rest:(ows "||" ows logical_and_expression)* { return buildBinaryExpression(first, rest); }


assignment_expression
  = lhs:lhs_expression ows "=" !"=" ows rhs:assignment_expression { return { _type: 'assignment', lhs: lhs, rhs: rhs, op: '=' } }
  / lhs:lhs_expression ows op:assignment_operator ows rhs:assignment_expression { return { _type: 'assignment', lhs: lhs, rhs: rhs, op: op } }
  / logical_or_expression

assignment_operator
  = "*="
  / "/="
  / "%="
  / "+="
  / "-="
  / "<<="
  / ">>="
  / "&="
  / "^="
  / "|="

arguments
  = first:expression ows "," ows rest:arguments { rest.unshift(first); return rest; }
  / first:expression { return [first]; }
  / ows { return []; }

inline_function
  = function ows "(" ows params:parameters ows ")" ows type:type_signature ows "->" ows expr:expression { return {_type: 'inline function', return_type: type, params: params, returns:expr } }
  / function ows "(" ows params:parameters ows ")" ows "->" ows expr:expression { return {_type: 'inferred inline function', params: params, returns:expr } }
  / function ows "(" ows params:parameters ows ")" ows type:type_signature ows body:block { return {_type: 'anonymous block function', block: body, params: params, return_type: type } }
  / function ows "(" ows params:parameters ows ")" ows body:block { return {_type: 'inferred anonymous block function', block: body, params: params } }

function_declaration
  = function ws name:variable_name ows "(" ows params:parameters ows ")" ows type:type_signature ows body:block { return {_type:'function declaration', name:name, return_type:type, block: body, params: params } }
  / function ws name:variable_name ows "(" ows params:parameters ows ")" ows body:block { return {_type:'inferred function declaration', name:name, block: body, params: params } }
  / function ws name:variable_name ows "(" ows params:parameters ows ")" ows type:type_signature ows terminator { return {_type:'function declaration', name:name, return_type: type, block: null, params: params } }

block
  = "[" ows captures:untyped_parameters ows "]" ows body:non_capture_block { return {_type:'capture block', captures: captures, block: body } }
  / body:non_capture_block { return {_type:'non capture block', body: body } }

non_capture_block
  = "{" ows EOL* ows s:statements ows EOL* ows "}" { return {_type:'block', statements: s } }

parameters
  = name:variable_name ows ":" ows type:type_signature ows "," ows rest:parameters {
      rest.unshift({_type:'typed parameter', name: name, type: type}); return rest }
  / name:variable_name ows ":" ows type:type_signature { return [{_type:'typed parameter', name: name, type: type }] }
  / untyped_parameters
  / ows { return []; }

type_signature
  = function ows "(" ows params:type_parameters ows ")" ows ret:type_signature? { 
      var name = 'fn(';
      if (params.length === 0)
        name += 'void';
      for (var i = 0; i < params.length; i++) { // this might need tweaking
        name += params[i].name;
        if (i < params.length-1)
          name += ',';
      }
      name += ')' + (ret !== null ? ret.name : 'void');
      if (ret === null) ret = {_type:'type', name: 'void'};
      return { _type:'function type', params: params, returns: ret, name:name } 
    }
  / name:("*"? "&"? identifier) { return { _type:'type', name:name.join("") } }

type_parameters
  = first:type_signature ows "," ows rest:type_parameters { rest.unshift(first); return rest; }
  / first:type_signature { return [first]; }
  / ows { return []; }

untyped_parameters
  = first:variable_name ows "," ows rest:untyped_parameters { rest.unshift({_type:'parameter', name:first}); return rest; }
  / first:variable_name { return [{_type:'parameter', name:first}]; }

return_statement
  = return ws expr:expression { return {_type: 'return', expr:expr}; }
  / return { return {_type: 'return'}; }

continue_statement
= continue { return {_type: 'continue'}; }

break_statement
= break { return {_type: 'break'}; }

defer_statement
  = defer ws expr:expression { return {_type: 'defer', expr:expr}; }

if_statement
  = if ows "(" expr:expression ")" ows body:non_capture_block ows elseifs:else_if_statements? ows _else:else_statement? { return {_type: 'if statement', expr:expr, block:body, else_if_statements: elseifs, else_statement: _else } }

else_if_statements
  = (s:else_if_statement ows { return s; })*

else_if_statement
  = else ws if ows "(" expr:expression ")" ows body:non_capture_block { return {_type: 'else if statement', expr:expr, block:body } }

else_statement
  = else ows body:non_capture_block { return {_type: 'else statement', block:body } }

loop_statement
  = loop ows "(" ows name:variable_name ows ":" type:type_signature ws in ws iterable:additive_expression ")" ows body:non_capture_block { return {_type:'loop statement', name:name, type: type, iterable:iterable, block:body } }
  / loop ows "(" ows name:variable_name ws in ws iterable:additive_expression ")" ows body:non_capture_block { return {_type:'inferred loop statement', name:name, iterable:iterable, block:body } }
 / loop ows "(" ows cond:expression ows ")" ows body:non_capture_block { return {_type:'conditional loop statement', cond:cond, block:body } }
  / loop ows body:non_capture_block { return {_type:'simple loop statement', block:body } }
