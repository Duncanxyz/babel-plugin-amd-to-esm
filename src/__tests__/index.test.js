const babel = require('@babel/core');
const plugin = require('../index.js');

const fs = require('fs');
const path = require('path');

function makeTest(name) {
  const originCode = fs.readFileSync(
    path.resolve(__dirname, `./code/${name}.js`),
    'utf8'
  );

  const { code } = babel.transform(originCode, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
}

it('all feature', () => {
  makeTest('all-feature');
});

it('no dependencies two params', () => {
  makeTest('no-dependencies-two-params');
});

it('no dependencies one param', () => {
  makeTest('no-dependencies-one-param');
});

it('arrow function', () => {
  makeTest('arrow-function');
});
