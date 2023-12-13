const fs = require('fs');
const path = require('path');

let handleESMDependencies = false;

const fileRecords = {
  isInit: false,
  init({ rootDir, alias }) {
    fileRecords.rootDir = rootDir || process.cwd();
    fileRecords.alias = alias || {};
    fileRecords.isInit = true;
  },
  data: new Map(),
  rootDir: '',
  alias: {},
};

module.exports = function (babel) {
  const { types: t, parseSync } = babel;

  return {
    name: 'amd-to-esm',
    visitor: {
      Program(programPath, state) {
        handleESMDependencies = state.opts.handleESMDependencies || false;

        if (handleESMDependencies && !fileRecords.isInit) {
          fileRecords.init({
            rootDir: state.opts.rootDir,
            alias: state.opts.alias,
          });
        }

        const body = programPath.get('body');
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
            let fileType;
            handleESMDependencies &&
              (fileType = getFileType(
                resolvePath(state.filename, depsPath[index]),
                parseSync
              ));

            if (t.isObjectPattern(item)) {
              if (handleESMDependencies && fileType === 'esm') {
                if (
                  item.properties.length == 1 &&
                  item.properties[0].key.name === 'default'
                ) {
                  return [
                    t.importDefaultSpecifier(
                      t.identifier(item.properties[0].value.name)
                    ),
                  ];
                }

                return item.properties.map((property) => {
                  if (property.key.name === property.key.value) {
                    return t.ImportSpecifier(t.identifier(property.key.name));
                  }

                  return t.importSpecifier(
                    t.identifier(property.value.name),
                    t.identifier(property.key.name)
                  );
                });
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
                return [t.importDefaultSpecifier(identifier)];
              }
            } else {
              if (handleESMDependencies && fileType === 'esm') {
                return [t.importNamespaceSpecifier(t.identifier(item.name))];
              }

              return [t.importDefaultSpecifier(t.identifier(item.name))];
            }
          });
          const importDeclarations = depsPath.map((depPath, index) => {
            if (!factoryParams[index]) {
              return t.importDeclaration([], t.stringLiteral(depPath));
            }

            return t.importDeclaration(
              factoryParams[index],
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

function getFileType(targetPath, parseSync) {
  if (fileRecords.data.has(targetPath)) {
    return fileRecords.data.get(targetPath);
  }

  // only .js/.vue/.jsx are considered.
  if (!/\.((js)|(vue)|(jsx))$/.test(targetPath)) {
    if (fs.existsSync(`${targetPath}.vue`)) {
      targetPath = `${targetPath}.vue`;
    } else if (fs.existsSync(`${targetPath}.jsx`)) {
      targetPath = `${targetPath}.jsx`;
    } else {
      targetPath = `${targetPath}.js`;
    }
  }

  let fileType;
  if (/\.((vue)|(jsx))$/.test(targetPath)) {
    fileType = 'esm';
  } else if (/\.js$/.test(targetPath) && fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf-8');

    const ast = parseSync(content);

    if (
      ast.program.body.some((item) =>
        [
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportDefaultDeclaration',
        ].includes(item.type)
      )
    ) {
      fileType = 'esm';
    } else if (
      ast.program.body.some((item) => {
        return (
          item.type === 'ExpressionStatement' &&
          item.expression &&
          item.expression.type === 'CallExpression' &&
          item.expression.callee &&
          item.expression.callee.name === 'define'
        );
      })
    ) {
      fileType = 'amd';
    } else {
      fileType = -1;
    }
  } else {
    fileType = -1;
  }

  fileRecords.data.set(targetPath, fileType);

  return fileType;
}

function resolvePath(sourcePath, targetPath) {
  if (/^\.{1,2}\//.test(targetPath)) {
    return path.resolve(sourcePath.replace(/(\/|\\)[^\/\\]*$/, ''), targetPath);
  }

  const aliasKeys = Object.keys(fileRecords.alias);
  if (aliasKeys.length) {
    const aliasKey = aliasKeys.find((item) => targetPath.startsWith(item));
    if (aliasKey) {
      return targetPath.replace(
        new RegExp(`^${aliasKey}`),
        fileRecords.alias[aliasKey]
      );
    }
  }

  return path.resolve(fileRecords.rootDir, targetPath);
}
