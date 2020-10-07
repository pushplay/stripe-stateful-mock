module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    rules: {

        "@typescript-eslint/camelcase": "off",          // Stripe doesn't work that way.
        "@typescript-eslint/explicit-module-boundary-types": ["error", {
            allowArgumentsExplicitlyTypedAsAny: true    // That's dumb.
        }],
        "@typescript-eslint/explicit-function-return-type": ["error", {
            allowExpressions: true,
            allowTypedFunctionExpressions: true
        }],
        "@typescript-eslint/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "semi",
                requireLast: true
            },
            singleline: {
                delimiter: "comma",
                requireLast: false
            }
        }],
        "@typescript-eslint/no-empty-function": "off",  // That's just stupid.
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": ["error", {
            ignoreParameters: true
        }],
        "@typescript-eslint/no-namespace": "off",       // Namespaces that overlap interfaces are useful.
        "@typescript-eslint/no-use-before-define": ["error", {
            functions: false
        }],
        "@typescript-eslint/no-var-requires": "off",    // It's occasionally useful to inline a require; especially json.
        "@typescript-eslint/no-unused-vars": ["error", {
            args: "none"                                // Often useful to document functions.
        }],
        "no-inner-declarations": "off",                 // Needed to allow functions exported from namespaces.
        "no-constant-condition": ["error", {
            checkLoops: false
        }],
        "semi": "error"
    }
};
