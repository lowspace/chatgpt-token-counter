const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    tokenizerGPT4: './node_modules/@lenml/tokenizer-gpt4/dist/main.js',
    tokenizerGPT4O: './node_modules/@lenml/tokenizer-gpt4o/dist/main.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: '[name]',
      type: 'var'  // 使用 'var' 来把你的库输出为一个全局变量
    }
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        tokenizers: {
          test: /node_modules\/@lenml\/tokenizers\/dist\/main\.js/,
          name: 'tokenizers',
          chunks: 'initial',
          priority: 10
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(json)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'models/[name].[ext]'
            }
          }
        ],
        include: [
          path.resolve(__dirname, 'node_modules/@lenml/tokenizer-gpt4/models'),
          path.resolve(__dirname, 'node_modules/@lenml/tokenizer-gpt4o/models'),
          path.resolve(__dirname, 'node_modules/@lenml/tokenizers/models')
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json']
  }
};
