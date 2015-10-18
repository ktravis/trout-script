# trout-script
Compiled, strongly-typed scripting language written in javascript.

*This was my first (real) attempt at writing a full programming language.
I learned a lot in the process, and will eventually return to make it stable and
clean everything up.*

## Features

- strictly typed variables
- runtime within Javascript
- compiler emits 'runtime operations' as js
- struct types
- function closures
- explicit control of context within closures
- readable, unambiguous syntax

## Examples

  ```
  var x = 1  // inferred type
  var y:int  // not initialized, but declared
  var hello:string
  hello = "world"
  
  struct Node {
    val:string
    next:Node   // struct allows recursive definition
  }

  struct vec {
    x:int = 0,  // default values
    y:int = 0
  }

  // functions declared with 'fn' and '(' arguments ')'
  fn factorial(x:int) int { // return type can be inferred by compiler, or
  specified following arguments
    var out = 1
    loop (x > 0) {
      out *= x--
    }
    return out
  }
  print('fact(10) = '|to_string(factorial(10))) // '|' concatentates strings

  var head:Node // structs are initialized when declared
  head.val = "I'm first"
  var next:Node
  next.val = "I'm next"
  head.next = next

  loop {
    if (head.next == null) {
      break
    } else {
      print(head.val)
      head = head.next
    }
  }
  ```
