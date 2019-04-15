const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: {
        app: ['./src/index.js']
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          loaders: ['react-hot-loader/webpack', 'babel-loader'],
        },
        {
            test: /\.js$/,
            exclude: /node_modules/,
            use: ['babel-loader', 'eslint-loader']
        }
      ]
    },
    resolve: {
      extensions: ['*', '.js', '.jsx']
    },
    devtool: 'inline-source-map',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/dist/',
      },
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ],
    resolve: {
        unsafeCache: /\.*node_modules\.*/,
        modules: [
          path.resolve('./src'),
          path.resolve('./node_modules')
        ],
        alias: {
            'react-dom': '@hot-loader/react-dom'
        }
    },
    devServer: {
      contentBase: './dist',
      hot: true,
      historyApiFallback: {
        index: 'index.html'
      }
    }
  };