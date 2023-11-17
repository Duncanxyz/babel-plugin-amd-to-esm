const babel = require('@babel/core');
const plugin = require('../../index.js');

const fs = require('fs');
const path = require('path');
const mock = require('mock-fs');

it('handle esm', () => {
  mock({
    code: mock.load(path.resolve(__dirname, './code')),
    node_modules: mock.load(path.resolve(__dirname, '../../../node_modules')),
  });

  const rootDir = path.resolve('./code');

  const originCode = fs.readFileSync(
    path.resolve(rootDir, './wrapper/amd-a.js'),
    'utf8'
  );
  const { code } = babel.transform(originCode, {
    filename: path.resolve(rootDir, './wrapper/amd-a.js'),
    plugins: [
      [
        plugin,
        {
          handleESMDependencies: true,
          rootDir: rootDir,
          alias: {
            '@': rootDir,
          },
        },
      ],
    ],
  });
  expect(code).toMatchSnapshot();

  mock.restore();
});
