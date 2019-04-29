module.exports = {
    "parser": "babel-eslint",
    "settings":{
        "react":{
            "version": "detect"
        }
    },
    "plugins": [
        "react"
    ],
    "extends": ["eslint:recommended", "plugin:react/recommended"],
    "env": {
      "browser": true,
      "commonjs": true,
      "es6": true,
      "node": true
    },
    "parserOptions": {
      "ecmaVersion": 2018,
      "ecmaFeatures": {
        "jsx": true
      },
      "babelOptions": {
        "configFile": "./.babelrc"
      }
    },
    "rules": {
      "no-console": "warn",
      "strict": ["error", "global"],
      "curly": "warn"
    }
  }