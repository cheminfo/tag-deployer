#!/usr/bin/node
'use strict';

var deployer = require('..');
var args = require('minimist')(process.argv.slice(2));

try {
    console.log(args.config);
    deployer(args.config).then(function() {
        console.log('done');
    });
} catch(e) {
    console.error('Error occured while deploying', e.message, e.stack);
}

