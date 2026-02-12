module.exports = {
    extends: [
        '../../.eslintrc.cjs',
        'plugin:vue/vue3-recommended',
        'prettier',
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
    },
    rules: {
        'vue/multi-word-component-names': 'off',
    },
};
