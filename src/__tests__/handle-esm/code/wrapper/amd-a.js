define([
  '../amd-b.js',
  '../esm-a.js',
  '@/esm-b',
  './VueComponent',
  '../ReactComponent',
], function (
  { amdB1, default: amdB2 },
  { esmA1, default: esmDefault, esmA2: esmAA2 },
  esmB,
  { default: VueComponent },
  { default: ReactComponent }
) {
  return {
    name: 'amd-a',
  };
});
