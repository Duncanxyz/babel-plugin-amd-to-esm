# babel-plugin-amd-to-esm

A Babel plugin that converts AMD modules to ES modules

## Installation

```bash
npm install --save-dev @babel/core babel-plugin-amd-to-esm
# yarn add --save-dev @babel/core babel-plugin-amd-to-esm
# pnpm add --save-dev @babel/core babel-plugin-amd-to-esm
```

## Usage

In babel config file like **.babelrc.js**

```javascript
module.exports = {
  plugins: ['babel-plugin-amd-to-esm'],
};
```

## Features

> The following sample code has been formatted and may produce slight variations when run, but it does not affect the logic of the code.

### Overview

- source code

```javascript
console.log('before code');

define(['depA', 'depB', 'depC', 'depD', 'depE'], function (
  a,
  { default: b },
  {
    c1,
    c2: c2,
    c3: c3x,
    c4: {
      cc4: { ccc4 },
    },
  },
  { d1 }
) {
  // inner code
  console.log('inner code start');

  return {
    property: 'property',
    name: 123,
  };

  console.log('inner code end');
});

console.log('after code');
```

- converted code

```javascript
console.log('before code');
import a from 'depA';
import b from 'depB';
import _amdDep from 'depC';
import _amdDep2 from 'depD';
import('depE');
const {
  c1,
  c2,
  c3: c3x,
  c4: {
    cc4: { ccc4 },
  },
} = _amdDep;
const { d1 } = _amdDep2;
// inner code
console.log('inner code start');
export default {
  property: 'property',
  name: 123,
};
console.log('inner code end');
console.log('after code');
```

### No dependencies

#### Two params

- source code

```javascript
define([], function () {
  return {
    name: 'module-no-dependencies-two-params',
  };
});
```

- converted code

```javascript
export default {
  name: 'module-no-dependencies-two-params',
};
```

#### One param

- source code

```javascript
define(function () {
  return {
    name: 'module-no-dependencies-one-param',
  };
});
```

- converted code

```javascript
export default {
  name: 'module-no-dependencies-one-param',
};
```

### Arrow function

- source code

```javascript
define(['a'], (a) => ({
  name: 'module-arrow-function',
}));
```

- converted code

```javascript
import a from 'a';
export default {
  name: 'module-arrow-function',
};
```

### Unsupported Features

- **define** call with three parameters is not supported.

```javascript
define('module-name', ['depA'], function () {});
```

- If a script file contains multiple **define** statements, only the first **define** statement will be converted, and others will be ignored.
