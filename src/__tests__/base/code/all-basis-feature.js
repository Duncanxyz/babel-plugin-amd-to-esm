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
