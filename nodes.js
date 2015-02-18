exports.FloatNode = function FloatNode(value) { this.value = value; };
exports.IntNode = function IntNode(value) { this.value = value; };
exports.StringNode = function StringNode(value) { this.value = value; };
exports.TrueNode = function TrueNode() {};
exports.FalseNode = function FalseNode() {};
exports.NullNode = function NullNode() {};

exports.DeclareVariableNode = function DeclareVariableNode(name, typeNode, valueNode) {
    this.name = name;
    this.typeNode = typeNode;
    this.valueNode = valueNode;
};
exports.DeclareInferredVariableNode = function DeclareInferredVariableNode(name, valueNode) {
    this.name = name;
    this.valueNode = valueNode;
};

exports.GetVariableNode = function GetVariableNode(name) { this.name = name; };
exports.SetVariableNode = function SetVariableNode(name, valueNode) {
    this.name = name;
    this.valueNode = valueNode;
};

exports.StructDeclarationNode = function StructDeclarationNode(name, blockNode) {
    this.name = name;
    this.blockNode = blockNode;
};
exports.TypeDeclarationNode = function TypeDeclarationNode(name, typeNode) {
    this.name = name;
    this.typeNode = typeNode;
};

exports.GetReferenceNode = function GetReferenceNode(name) { this.name = name; };

exports.GetMemberNode = function GetMemberNode(objectNode, name) {
    this.objectNode = objectNode;
    this.name = name;
};
exports.SetMemberNode = function SetMemberNode(valueNode, name, valueNode) {
    this.objectNode = objectNode;
    this.name = name;
    this.valueNode = valueNode;
};

exports.CallNode = function CallNode(objectNode, name, argumentNodes) {
    this.objectNode = objectNode;
    this.name = name;
    this.argumentNodes = argumentNodes;
};

exports.UnaryLeftOperationNode = function UnaryLeftOperationNode(opNode, objectNode) {
    this.opNode = opNode;
    this.objectNode = objectNode;
};
exports.UnaryRightOperationNode = function UnaryRightOperationNode(objectNode, opNode) {
    this.objectNode = objectNode;
    this.opNode = opNode;
};
exports.BinaryOperationNode = function BinaryOperationNode(objectNode1, opNode, objectNode2) {
    this.objectNode1 = objectNode1;
    this.opNode = opNode;
    this.objectNode2 = objectNode2;
};

exports.OpNode = function OpNode(name) { this.name = name; };

exports.InlineFunctionNode = function InlineFunctionNode(parameters, typeNode, expression) {
    this.parameters = parameters;
    this.typeNode = typeNode;
    this.expression = expression;
};
exports.InferredInlineFunctionNode = function InferredInlineFunctionNode(parameters, expression) {
    this.parameters = parameters;
    this.expression = expression;
};
exports.AnonBlockFunctionNode = function AnonBlockFunctionNode(parameters, blockNode) {
    this.parameters = parameters;
    this.blockNode = blockNode;
};

exports.FunctionDeclarationNode = function FunctionDeclarationNode(name, parameters, typeNode, blockNode) {
    this.name = name;
    this.parameters = parameters;
    this.typeNode = typeNode;
    this.blockNode = blockNode;
};
exports.InferredFunctionDeclarationNode = function InferredFunctionDeclarationNode(name, parameters, blockNode) {
    this.name = name;
    this.parameters = parameters;
    this.blockNode = blockNode;
};

exports.CaptureBlockNode = function CaptureBlockNode(captures, statements) {
    this.captures = captures;
    this.statements = statements;
};
exports.BlockNode = function BlockNode(statements) {
    this.statements = statements;
};

exports.TypedParameterNode = function TypedParameterNode(name, typeNode) {
    this.name = name;
    this.typeNode = typeNode;
};

exports.FunctionTypeNode = function FunctionTypeNode(parameterTypeNodes, returnTypeNode) {
    this.parameterTypeNodes = parameterTypeNodes;
    this.returnTypeNode = returnTypeNode;
};
exports.TypeNode = function TypeNode(name) { this.name = name; };

exports.NewNode = function NewNode(name, argumentNodes) {
    this.name = name;
    this.argumentNodes = argumentNodes;
};

exports.ReturnNode = function ReturnNode(valueNode) {
    this.valueNode = valueNode;
};
