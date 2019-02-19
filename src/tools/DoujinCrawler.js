const fs = require('fs');
const path = require('path');
// https://github.com/bda-research/node-crawler
var Crawler = require("crawler");

const util = require("../util");
const fileiterator = require('../file-iterator');
const userConfig = require('../user-config');
const nameParser = require('../name-parser');
const strictUriEncode = require('strict-uri-encode');

// var db = new loki('doujin_info.db');

function isDateValid(date){
    return !isNaN(date.getTime());
}

function assert(condition, message) {
    if (!condition) {
        debugger
        throw message || "Assertion failed";
    }
}

function getSubstringWithPrefix(prefix, datas){
    for(let ii = 0; ii < datas.length; ii++){
        const e = datas[ii];
        if(e.startsWith(prefix)){
            const sub = e.substring(prefix.length).trim();
            if(sub){
                return sub;
            }
        }
    }
}
 
var doujinSearch = new Crawler({
     maxConnections : 1,
     // 两次请求之间将闲置1000ms
     rateLimit: 1000,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        const _filename = res.options._fileName;
        const _author = res.options._author;

        if(error){
            console.error(error, _filename);
        }else{
            var $ = res.$;
            const booksinfos = $(".bookinfo")
            let found = false;
            if(booksinfos.length > 0){
                for(let ii = 0; ii < booksinfos.length; ii++){
                    const row = $(booksinfos[ii]);
                    const rawStr = row.text();

                    if(!rawStr.includes(_author)){
                        continue;
                    }

                    const datas = rawStr.split("\n").map(e => e.trim()).filter(e => e.length > 0);

                    const getValue = (key) => {
                        let index = datas.indexOf(key);
                        if(index > -1){
                            return datas[index+1];
                        }
                    }

                    const title = getValue("Original:");
                    const type = getValue("Type:")
                    const parodies = getValue("Parodies:")

                    let time = getSubstringWithPrefix("Date: ", datas);
                    if(!isDateValid(new Date(time))){
                        time = getSubstringWithPrefix("Modified: ", datas);

                        if(isDateValid(new Date(time))){
                            time = new Date(time);
                        }else{
                            time = undefined;
                        }
                    }

                    if (_filename.includes(title)) {
                        //not 100% accuracy
                        const entry = {fileName: _filename, title, type, parodies, time};
                        console.log(entry);
                        found = true;
                        break;
                    }
                }
            }

            if(!found){ 
                console.log("NOT FOUND", _filename);
            }
        }
        done();
    }
});

const filter = (e) => {return util.isCompress(e);};
const results = fileiterator(userConfig.home_pathes, { filter });
const len = 10; //results.length

function sendSearch(p){
    const base = path.basename(p, path.extname(p));
    const parseResult = nameParser.parse(base);

    if(parseResult && parseResult.author && parseResult.title){

        let searchWord = parseResult.author + "  " + parseResult.title;
        let uri = "https://www.doujinshi.org/search/simple/?T=objects&sn=" + searchWord;
        console.log("queue", uri)
        doujinSearch.queue({
            uri: "https://www.doujinshi.org/search/simple/?T=objects&sn=" +  strictUriEncode(searchWord),
            proxy:'http://localhost:11080',
            
            //used by callback
            _fileName: base,
            _author: parseResult.author
        });

        uri = "https://www.doujinshi.org/search/simple/?T=objects&sn=" + parseResult.title;
        console.log("queue", uri)
        doujinSearch.queue({
            uri: "https://www.doujinshi.org/search/simple/?T=objects&sn=" +  strictUriEncode(parseResult.title),
            proxy:'http://localhost:11080',
            
            //used by callback
            _fileName: base,
            _author: parseResult.author
        });
    }
}

sendSearch("(C94) [Lonely Church (鈴音れな)] 猫姦～成猫編～ (オリジナル).zip")

for (let i = 0; i < len; i++) {
    const p = results[i];
}
