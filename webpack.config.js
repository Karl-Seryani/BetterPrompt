//@ts-check
'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'nosources-source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // Ensure core modules are resolved correctly
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'core/prompts', to: 'core/prompts' }
      ]
    })
  ]
};

module.exports = config;
