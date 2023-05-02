module.exports = {
  env: {
    node: true,
    es6: true,
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error'],
    'no-console': 'off',
    // 不允许省略花括号，如if语句
    curly: ['error', 'all'],
  },
};
