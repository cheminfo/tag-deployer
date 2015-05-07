'use strict';

const join = require('path').join;
const fs = require('fs-extra');

try {
    var config = require('./config.json');
}
catch(e) {
    console.log('config.json does not exist or is an invalid json file');
    process.exit(0);
}

if(!Array.isArray(config.repos)){
    config.repos = [config.repos];
}
var conf = [];
for(let i=0 ;i<config.repos.length ;i++) {
    var repo = config.repos[i];
    var r = {};
    var m = repo.url.match(/([^\/:]*)(?:[\/:])([^\/]*?)(\/|\.git)?$/);
    if(!m) {
        console.log('regex on repo url failed');
        continue;
    }

    if(!repo.dest) {
        console.log('Missing dest in config');
        continue;
    }
    r.org = m[1];
    r.name = m[2];
    r.repoDir = join((repo.repo || config.repo), r.org, r.name);
    r.orgDir =  join((repo.repo || config.repo), r.org);
    r.destDir = repo.dest;
    r.url = repo.url;
    r.isNew = !fs.existsSync(r.repoDir);
    r.build = repo.build;
    conf.push(r);
    console.log(r);
}

module.exports = conf;