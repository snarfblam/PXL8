var webpack = require('webpack');
const path = require('path');

const ROOT = path.resolve( __dirname, 'src' );

module.exports = {
    // mode: 'production',
    mode: 'development', // overridden
    entry: './src/index.ts',
    stats: 'normal',
    output: {
        path: path.resolve(__dirname, "dist"),
        libraryTarget: 'var',
        library: 'pxl8',
        filename: "pxl8.js",
    },
    devtool: 'source-map',
    // module: {
    //     rules: [
    //         // {
    //         //     test: /\.tsx?$/,
    //         //     loaders: ['babel-loader', 'ts-loader?' + JSON.stringify({
    //         //         presets: ["es2015", { "modules": false }]
    //         //     })],
    //         //     'exclude': [/node_modules/],
    //         //     // query: {
    //         //     //     presets: ["es2015", { "modules": false }]
    //         //     // }
    //         // },
    //         {
    //             test: /\.js$/,
    //             loader: 'babel-loader',
    //             query: {
    //                 presets: ['es2015']
    //             }
    //         }

    //     ]
    // },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            ROOT,
            'node_modules'
        ]
    },

    module: {
        rules: [
            /****************
            * PRE-LOADERS
            *****************/
            // {
            //     enforce: 'pre',
            //     test: /\.js$/,
            //     use: 'source-map-loader'
            // },
            // {
            //     enforce: 'pre',
            //     test: /\.ts$/,
            //     exclude: /node_modules/,
            //     use: 'ts-loader'
            // },

            /****************
            * LOADERS
            *****************/
            {
                test: /\.ts$/,
                exclude: [ /node_modules/ ],
                use: 'ts-loader'
                // use: 'awesome-typescript-loader'
            }
        ]
    },
    node: {
        Buffer: false,
    },
    plugins: [
        new webpack.LoaderOptionsPlugin({
          debug: true
        })
    ]
};