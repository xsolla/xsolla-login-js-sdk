module.exports = function(babel) {
    babel.cache(true);

    return {
        "presets": [["@babel/env", { "modules": false }]],
        "env": {
            "test": {
                "presets": [["@babel/env", { "targets": { "node": "current" } }]]
            }
        }
    };
};