'use strict';
var path = require('path');
var join = path.join;
var fs = require('fs-extra');


module.exports = {
    create: function() {
        fs.writeFileSync(join(__dirname, 'run.pid'), '');
    },
    remove: function() {
        console.log('remove pid');
        if(module.exports.exists())
            fs.unlinkSync(join(__dirname, 'run.pid')); // not a proper pid file...
    },
    exists: function() {
        return fs.existsSync(join(__dirname, 'run.pid'));
    }
};