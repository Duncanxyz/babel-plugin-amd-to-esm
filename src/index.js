module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'amd-to-esm',
    visitor: {
      Program(path, state) {
        const body = path.get('body');
        const defineNodePath = body.find(
          (item) =>
            t.isExpressionStatement(item) &&
            t.isIdentifier(item.node.expression.callee, {
              name: 'define',
            })
        );

        // No define call
        if (!defineNodePath) {
          return;
        }
        if (defineNodePath.node.expression.arguments.length >= 3) {
          console.warn(
            `Currently does not support writing with three or more parameters for define function, please check! (${state.filename})`
          );
          return;
        }

        // Only handle the first define statement, other define will be ignored
        let deps, factory;
        const defineArguments = defineNodePath.get('expression.arguments');
        if (defineArguments.length == 1) {
          factory = defineArguments[0];
        } else {
          [deps, factory] = defineArguments;
        }

        const insteadNodeList = [];

        // if there are dependencies
        if (deps && t.isArrayExpression(deps.node)) {
          const depsPath = deps.node.elements.map((item) => {
            return item.value;
          });
          const uniqueDeclarations = [];
          const factoryParams = factory.node.params.map((item, index) => {
            if (t.isObjectPattern(item)) {
              if (
                item.properties.some(
                  (property) => property.key.name == 'default'
                )
              ) {
                if (item.properties.length > 1) {
                  throw new Error(
                    `Currently does not support mixing default and other destructuring, such as: define(['dependA'], function({default: A, AProperty1}) {}) (${state.filename})`
                  );
                }
                return t.identifier(item.properties[0].value.name);
              } else {
                // Destructuring
                const identifier = defineNodePath.scope.generateUidIdentifier(
                  `amdDep${index}`
                );
                uniqueDeclarations.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      createParamsObjectPattern(item.properties),
                      identifier
                    ),
                  ])
                );
                return identifier;
              }
            } else {
              return t.identifier(item.name);
            }
          });
          const importDeclarations = depsPath.map((depPath, index) => {
            if (!factoryParams[index]) {
              return t.expressionStatement(
                t.callExpression(t.identifier('import'), [
                  t.stringLiteral(depPath),
                ])
              );
            }
            return t.importDeclaration(
              [t.importDefaultSpecifier(factoryParams[index])],
              t.stringLiteral(depPath)
            );
          });

          insteadNodeList.push(...importDeclarations, ...uniqueDeclarations);
        }

        if (t.isBlockStatement(factory.node.body)) {
          // Only support usage with one return
          const factoryReturnIndex = factory.node.body.body.findIndex((item) =>
            t.isReturnStatement(item)
          );
          if (factoryReturnIndex != -1) {
            const factoryReturn = factory.get(
              `body.body.${factoryReturnIndex}`
            );
            factoryReturn.replaceWith(
              t.exportDefaultDeclaration(
                factory.node.body.body[factoryReturnIndex].argument
              )
            );
          }

          insteadNodeList.push(...factory.node.body.body);
        } else {
          insteadNodeList.push(t.exportDefaultDeclaration(factory.node.body));
        }

        defineNodePath.replaceWithMultiple(insteadNodeList);
        // Support nested object destructuring
        function createParamsObjectPattern(properties) {
          return t.objectPattern(
            properties.map((property) => {
              if (!t.isObjectPattern(property.value)) {
                return t.objectProperty(
                  t.isMemberExpression(property.key)
                    ? property.key
                    : t.identifier(property.key.name),
                  t.identifier(property.value.name),
                  false,
                  property.key.name == property.value.name
                );
              }
              return t.objectProperty(
                t.identifier(property.key.name),
                createParamsObjectPattern(property.value.properties)
              );
            })
          );
        }
      },
    },
  };
};
