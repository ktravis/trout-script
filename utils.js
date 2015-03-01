module.exports.extend = function (base, ext) {
	var out = {};
	for (k in base)
		if (base.hasOwnProperty(k))
			out[k] = base[k];
	for (k in ext)
		if (ext.hasOwnProperty(k))
			out[k] = ext[k];
	return out;
};
var Set = function (list, key) {
  this.map = {};
  this.internal = [];
  this.key = key || function (v) { return v; };
  if (list !== undefined)
    for (var i = 0; i < list.length; i++) {
      this.push(v);
    }
  this.length = this.internal.length;
};
Set.prototype.push = function (v) {
  var k = this.key(v);
  if (!this.map.hasOwnProperty(k)) {
    this.internal.push(v);
    this.map[k] = true;
  }
  this.length = this.internal.length;
};
Set.prototype.pop = function () {
  var v = this.internal.pop();
  var k = this.key(v);
  this.map[k] = undefined;
  this.length = this.internal.length;
  return v;
};
Set.prototype.remove = function (v) {
  var k = this.key(v);
  this.map[v] = undefined;
  for (var i = 0; i < this.internal.length; i++)
    if (this.key(this.internal[i]) === k) {
      this.internal.splice(i, 1);
      break;
    }
  this.length = this.internal.length;
}
Set.prototype.contains = function (v) {
  var k = this.key(v);
  return this.map.hasOwnProperty(v);
}
function check_types (a, b) {
  a = clean_type(a);
  b = clean_type(b);
  if (a === 'dynamic' || b === 'dynamic')
    return true;
  else if (type_is_function(a)) {
    a = parse_fn_type(a);
    b = parse_fn_type(b);
    
    if (a.args.length !== b.args.length)
      return false;
    for (var i = 0; i < a.args.length; i++)
      if (!check_types(a.args[i],b.args[i]))
        return false;
    return check_types(a.returns,b.returns);
  } else
    return a === b;
};
function type_is_function (t) {
	return t.indexOf('(') > -1;
}
function type_is_reference (t) {
	return t[0] === '&';
}
function clean_type (t) {
  while (t.charAt(0) === '*' || t.charAt(0) === '&')
    t = t.slice(1);
  return t;
}
function parse_fn_type (fn) {
	fn = fn.replace(/\s+/g, '');
	var arg_opens = 0;
	var last_close_paren = -1;
	for (var i = 0; i < fn.length; i++) {
		if (fn[i] === '(')
			arg_opens++;
		if (fn[i] === ')') {
			if (arg_opens === 1) {
				last_close_paren = i;
				break;
			}
			arg_opens--;
		}
	}
	var ret = fn.substring(last_close_paren+1);
	fn = fn.substring(0,last_close_paren).replace(/^fn\(/, '');
	var opens = 0;
	var args = '';
	if (ret === undefined || ret.length < 1)
		ret = 'void';
	if (fn.length < 1) 
		args = ['void'];
	else {
		for (var i = 0; i < fn.length; i++) {
			if (fn[i] === '(')
				opens++;
			else if (fn[i] === ')')
				opens--;
			if (opens === 0 && fn[i] === '-') {
				ret = fn.substring(i+2);
				break;
			}
			args += fn[i] === ',' && opens === 0 ? '|' : fn[i];
		}
		args = args.split('|');	
	}
	return {args:args,returns:ret};
};
function fail (msg) {
  throw new Error(msg);
}
module.exports.check_types = check_types;
module.exports.parse_fn_type = parse_fn_type;
module.exports.type_is_function = type_is_function;
module.exports.type_is_reference = type_is_reference;
module.exports.clean_type = clean_type;
module.exports.Set = Set;
module.exports.fail = fail;
