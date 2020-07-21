const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: "./src/main.js",
  },
  devServer: {
    port: 8080,
    hot: true,
    inline: true,
    stats: 'errors-only',
    historyApiFallback: true,
    watchOptions: {
      aggregateTimeout: 100,
      poll: 500,
      ignored: /node_modules/
    },
	},
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [
              [
                "@babel/plugin-transform-react-jsx",
                { pragma: "ToyReact.createElement" },
              ],
            ],
          },
        },
      },
      {
        test: /.css/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "css-loader",
        },
      },
    ],
  },
  mode: "development",
  optimization: { minimize: false },
  devtool: 'cheap-module-eval-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
}