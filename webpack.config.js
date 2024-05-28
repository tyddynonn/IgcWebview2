var webpack = require("webpack");
const path = require('path');
  
module.exports = {
	mode: 'production',
    entry:  './src/index.js',	
    output: {
        path:     path.resolve(__dirname, "dist"),
        filename: 'bundle.js',
    },
	// node: {
	// 	fs: 'empty',
	// 	 child_process: 'empty'
	// },
    plugins: [
        new webpack.ProvidePlugin({         //ProvidePlugin gives jquery global scope- needed for plugins to work
            $: "jquery",
            jQuery: "jquery"
        }),
    ]


};
