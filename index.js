'use strict';

const fs = require('fs-extra');
const Promise = require('bluebird');
const url = require('url');
const walk = require('walk');
const child_process = require('child_process');
const execFile = child_process.execFile;
const config = require('./config');
const path = require('path');
const join = path.join;
const co = require('co');

function clone(repo) {
    return new Promise(function(resolve, reject) {
        fs.mkdirpSync(repo.orgDir);
        var options = {
            cwd: repo.orgDir
        };
        execFile('git', ['clone', repo.url, repo.name], options, function(err, stdout) {
            console.log('git clone done');
            if(err) return reject(err);
            resolve(stdout);
        });
    });

}

function pull(repo) {
    return new Promise(function(resolve, reject) {
        var options = {
            cwd: repo.repoDir
        };
        execFile('git', ['pull'], options, function(err, stdout) {
            console.log('git pull done');
            if(err) return reject(err);
            resolve(stdout);
        });
    });

}

function *updateRepo(repo) {
    if(repo.isNew)
        return yield clone(repo);
    else
        return yield pull(repo);

}

function getTags(repo) {
    return new Promise(function(resolve, reject) {
        execFile('git', ['ls-remote', '--tags', repo.repoDir], function(err, stdout) {
            console.log('git tag');
            if(err) return reject(err);
            var r = stdout.split('\n').filter(function(v){
                return !!v && v.split('\t').length === 2;
            }).map(function(v) {
                var x= v.split('\t');
                return {
                    sha: x[0],
                    tag: x[1].match(/\/([^\/]+)$/)[1]
                }
            });
            resolve(r);
        })
    });
}

function cloneTags(repo, tags) {
    var prom = [];
    for(let i=0; i<tags.length; i++) {
        console.log(tags[i]);
        // Already exists
        let dir = join(repo.destDir, tags[i].tag);
        if(fs.existsSync(dir)) continue;
        var p = new Promise(function(resolve, reject) {
            fs.mkdirpSync(repo.destDir);
            var options = {
                cwd: repo.destDir
            };
            console.log(options);
            execFile('git', ['clone', '--depth', '1', '-b', tags[i].tag, repo.url, tags[i].tag], options, function(err) {
                if(err) return reject(err);
                fs.remove(join(dir, '.git'), function(err) {
                    if(err) return reject(err);
                    console.log('git clone tag done');
                    resolve();
                });
            });
        });
        prom.push(p);
    }
    return Promise.all(prom);
}

function copyHead(repo) {
    return new Promise(function(resolve, reject) {
        fs.copy(repo.repoDir, join(repo.destDir, 'HEAD'), function(err) {
            if(err) return reject(err);
            fs.remove(join(repo.destDir, 'HEAD', '.git'), function(err) {
                if(err) reject(err);
                return resolve();
            })
        })
    });
}

function *doAll() {
        for(let i=0; i<config.length; i++) {
            yield doOne(config[i]);
        }
}

function *doOne(repo) {
    try {
        var out = yield updateRepo(repo);
        if(out.indexOf('Already up-to-date') > -1) console.log('nothing to do');
        yield copyHead(repo);
        var tags = yield getTags(repo);
        yield cloneTags(repo, tags);
        yield buildTags(repo, tags);
        yield doBuild(repo, join(repo.destDir, 'HEAD'));
    } catch(e) {
        console.log('error occured', e);
    }
}

co(function*() {
    yield doAll();
});

function *buildTags(repo, tags) {
    console.log(repo);
    for(let i=0; i<tags.length; i++) {
        yield doBuild(repo, join(repo.destDir, tags[i].tag));
    }
}

function doBuild(repo, dir) {
    return new Promise(function(resolve, reject) {
        var cmd = repo.build;
        console.log('do build', cmd);
        console.log('working directory', repo.destDir);
        var options = {
            cwd: dir
        };
        if(!repo.build) return resolve();
        child_process.exec(cmd, options, function(err) {
            if(err) reject(err);
            resolve();
        });
    });
}
