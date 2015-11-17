'use strict';

const fs = require('fs-extra');
const path = require('path');



function config(arg) {
    var config;
    if (arg instanceof Object) {
        config = arg;
    } else if (typeof arg === 'string') {
        let configPath = path.resolve(__dirname, arg);
        config = require(configPath);
    } else {
        throw new TypeError('config expect object or string');
    }


    if (!Array.isArray(config.repos)) {
        config.repos = [config.repos];
    }
    var conf = [];
    for (let i = 0; i < config.repos.length; i++) {
        var repo = config.repos[i];
        var r = {};
        var m = repo.url.match(/([^\/:]*)(?:[\/:])([^\/]*?)(\/|\.git)?$/);
        if (!m) {
            console.log('regex on repo url failed');
            continue;
        }

        if (!repo.dest) {
            console.log('Missing dest in config');
            continue;
        }
        r.org = m[1];
        r.name = m[2];
        r.repoDir = path.join((repo.repo || config.repo), r.org, r.name);
        r.orgDir = path.join((repo.repo || config.repo), r.org);
        r.destDir = repo.dest;
        r.url = repo.url;
        r.isNew = !fs.existsSync(r.repoDir);
        r.build = repo.build;
        conf.push(r);
    }
    return conf;
}


module.exports = config;