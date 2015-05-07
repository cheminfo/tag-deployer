'use strict';

const fs = require('fs-extra');
const path = require('path');
const join = path.join;
const Promise = require('bluebird');
const url = require('url');
const walk = require('walk');
const child_process = require('child_process');
const execFile = child_process.execFile;
const co = require('co');
const pid = require('./pid');

if (pid.exists()) {
    console.log('Process already running');
    process.exit(0);
}

pid.create();

process.on('uncaughtException', function (e) {
    console.log('Uncaught exception', e, e.stack);
    pid.remove();
});

const config = require('./config');


function clone(repo) {
    return new Promise(function (resolve, reject) {
        fs.mkdirpSync(repo.orgDir);
        var options = {
            cwd: repo.orgDir
        };
        execFile('git', ['clone', repo.url, repo.name], options, function (err, stdout) {
            console.log('git clone done');
            if (err) return reject(err);
            resolve(stdout);
        });
    });

}

function pull(repo) {
    return new Promise(function (resolve, reject) {
        var options = {
            cwd: repo.repoDir
        };
        execFile('git', ['pull'], options, function (err, stdout) {
            console.log('git pull done');
            if (err) return reject(err);
            resolve(stdout);
        });
    });

}

function *updateRepo(repo) {
    if (repo.isNew)
        return yield clone(repo);
    else
        return yield pull(repo);

}

function getTags(repo) {
    return new Promise(function (resolve, reject) {
        execFile('git', ['ls-remote', '--tags', repo.repoDir], function (err, stdout) {
            if (err) return reject(err);
            var r = stdout.split('\n').filter(function (v) {
                return !!v && v.split('\t').length === 2;
            }).map(function (v) {
                var x = v.split('\t');
                return {
                    sha: x[0],
                    tag: x[1].match(/\/([^\/]+)$/)[1]
                }
            }).filter(function (v) {
                var dir = join(repo.destDir, v.tag);
                return !fs.existsSync(dir);
            });
            console.log('git get tags done');
            resolve(r);
        })
    });
}

function cloneTags(repo, tags) {
    var prom = [];
    for (let i = 0; i < tags.length; i++) {
        // Already exists
        let dir = join(repo.destDir, tags[i].tag);
        var p = new Promise(function (resolve, reject) {
            fs.mkdirpSync(repo.destDir);
            var options = {
                cwd: repo.destDir
            };
            execFile('git', ['clone', '--depth', '1', '-b', tags[i].tag, repo.url, tags[i].tag], options, function (err) {
                if (err) return reject(err);
                fs.remove(join(dir, '.git'), function (err) {
                    if (err) return reject(err);
                    console.log('git clone tag ' + tags[i].tag + ' done');
                    resolve();
                });
            });
        });
        prom.push(p);
    }
    return Promise.all(prom);
}

function copyHead(repo) {
    return new Promise(function (resolve, reject) {
        fs.copy(repo.repoDir, join(repo.destDir, 'HEAD'), function (err) {
            if (err) return reject(err);
            fs.remove(join(repo.destDir, 'HEAD', '.git'), function (err) {
                if (err) reject(err);
                return resolve();
            })
        })
    });
}

function *doAll() {
    for (let i = 0; i < config.length; i++) {
        yield doOne(config[i]);
    }
}

function *doOne(repo) {
    yield updateRepo(repo);
    yield copyHead(repo);
    var tags = yield getTags(repo);
    yield cloneTags(repo, tags);
    yield buildTags(repo, tags);
    yield buildHead(repo)
}



co(function*() {
    yield doAll();
    pid.remove();
}).catch(function (e) {
    console.log('Caught exception', e, e.stack);
    pid.remove();
});

function *buildHead(repo) {
    console.log('do build for HEAD');
    return yield doBuild(repo, join(repo.destDir, 'HEAD'));
}

function *buildTags(repo, tags) {
    for (let i = 0; i < tags.length; i++) {
        let dir = join(repo.destDir, tags[i].tag);
        console.log('do build for ' + tags[i].tag);
        yield doBuild(repo, dir);
    }
}

function doBuild(repo, dir) {
    return new Promise(function (resolve, reject) {
        var cmd = repo.build;

        var options = {
            cwd: dir
        };

        if (!repo.build) {
            console.log('no build');
            return resolve();
        }
        console.log('do build', cmd);
        child_process.exec(cmd, options, function (err) {
            if (err) reject(err);
            resolve();
        });
    });
}
