var path = require("path");
var webpack = require('webpack');

module.exports = {
    entry:  [
        'webpack-dev-server/client?http://localhost:3000',
        'webpack/hot/dev-server',
        './src/index'
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "bundle.js",
        publicPath: "/static/"
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ],
    module: {
        loaders: [
            {
                test: /\.js$/,
                loaders: ['babel'],
                include: path.join(__dirname, 'src')
            },
            {
                test: /\.scss$/,
                loaders: ["style", "css", "sass"]
            }
        ]
    }
};