

const path = require('path');
const fs = require("fs");
const _ = require("underscore");
const userConfig = require('../user-config');

module.exports = function (folders, config) {
    const result = {pathes: [], infos: {} };
    config.visited = {};
    folders.forEach((src) => {
        if(fs.existsSync(src)){
            const stat = fs.statSync(src);
            if (stat.isFile()) {
                throw "only source folder path";
            } else {
                iterate(src, config, result, 0);
            }
        }else{
            if(userConfig.home_pathes.includes(src)){
                console.error(`[file-iterator] ${src} does not exist! Please check you user-config.js home_pathes`);
                console.error(`[file-iterator] ${src} 不存在! 检查一下你user-config.js的home_pathes`);
            }
        }
    });
    delete config.visited;
    return result;
};

function isLegalDepth(depth, config) {
    if (_.has(config, "depth")) {
        return depth <= config.depth;
    }
    return true;
}

function getStat(p, config){
    const stat = fs.statSync(p);
    const result = {};
    result.isFile = stat.isFile();
    result.isDirectory = stat.isDirectory();
    result.atimeMs = stat.atimeMs;
    result.mtimeMs = stat.mtimeMs;
    result.ctimeMs = stat.ctimeMs;
    result.atime = stat.atime;
    result.mtime = stat.mtime;
    result.ctime = stat.ctime;
    return result;
}

function iterate (p, config, result, depth) {
    if(config.visited[p]){
        return;
    }
    try {
        let stat = config.db && config.db.find({filePath: p});
        if(stat[0]){
            stat = stat[0].stat;
        }else{
            stat =  getStat(p, config);
            config.db.insert({filePath: p, stat: stat})
        }
        result.infos[p] = stat;

        if (stat.isFile) {
            if (config && config.filter && !config.filter(p)) {
                return;
            }

            if(config && config.doLog &&  result.pathes.length % 2000 === 0){
                console.log("[file-iterator] scan:", result.pathes.length);
            }
            result.pathes.push(p);
        } else if (stat.isDirectory && isLegalDepth(depth + 1, config)) {
            fs.readdirSync(p).forEach((e) => {
                e = path.join(p, e);
                iterate(e, config, result, depth + 1);
            });
        }
    } catch (e) {
        console.error("[file-iterator]",e);
    } finally{
        config.visited[p] = true;
    }
}
