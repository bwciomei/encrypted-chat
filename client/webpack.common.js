const path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        app: ['./src/index.js']
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'index.ejs'),
            filename: 'index.html'
        })
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: [ 'babel-loader', 'react-hot-loader/webpack', 'eslint-loader']
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
        unsafeCache: /\.*node_modules\.*/,
        modules: [
            path.resolve('./src'),
            path.resolve('./node_modules')
        ]
    }
};