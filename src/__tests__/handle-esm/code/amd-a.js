define(['amd-b.js', 'esm-a.js', '@/esm-b'], function (
  { amdB1 },
  { esmA1, default: esmDefault, esmA2: esmAA2 },
  esmB
) {
  return {
    name: 'amd-a',
  };
});
