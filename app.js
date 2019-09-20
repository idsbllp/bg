const fs = require('fs');
const axios = require('axios');
const { JSDOM } = require("jsdom");
const moment = require("moment");
const rimraf = require("rimraf");

const types = ['cat', 'dog', 'avengers', 'cute', 'tom+and+jerry',
  'Alvin+and+the+Chipmunks', 'minions'];
const dist = './download';
const archive = './archive';
const domain = 'https://wall.alphacoders.com';

const  hour = 1000 * 60 * 60; // 一个小时
const interval = hour * 2;

const log = console.log;
console.log = function(...args) {
  log.call(console, getTime(), '---', ...args);
}

// https://wall.alphacoders.com/by_category.php?id=9&name=Dark+Wallpapers
function getApiUrl(type, page = 1) {
  return `${domain}/search.php?search=${type}&page=${page}`
}

function getTime() {
  return moment().format('YYYY-MM-DD HH.mm');
}

let folderName = getTime();

async function download(url, i) {
  const fileName = getTime() + '---' + i;

  await axios({
    method: 'get',
    url,
    responseType: 'stream'
  }).then(function(response) {
    response.data.pipe(fs.createWriteStream(`${dist}/${fileName}.jpeg`))
  })
}

async function curl(url) {
  const res = await axios(url);

  return res && res.data;
}

function findAllUrls(htmlText, imgSelector) {
  const res = [];
  const dom = new JSDOM(htmlText);

  const imgs = dom.window.document.querySelectorAll(imgSelector);

  imgs.forEach(img => {
    if (img.href) {
      res.push(`${domain}/${img.href}`);
    } else {
      res.push(img.src);
    }
  });

  return res;
}

function getRandom(type) {
  const length = type.length;
  const random = Math.floor(Math.random() * length);

  return type[random];
}

function getPageNumber(htmlText) {
  const pageSelector = '.center .hidden-xs.hidden-sm .pagination li a';
  const dom = new JSDOM(htmlText);

  const pagesNumber = dom.window.document.querySelectorAll(pageSelector).length;

  const random = Math.floor(Math.random() * pagesNumber);

  return random;
}

async function main() {
  const type = getRandom(types);

  // 先 curl 获取 page
  let url = getApiUrl(type);
  let htmlText = await curl(url);
  const page = getPageNumber(htmlText);

  // 真正 curl 的地址
  url = getApiUrl(type, page);
  htmlText = await curl(url);

  console.log('真正的curl地址', url);

  const imgSelector = '.thumb-container .boxgrid a';
  const urls = findAllUrls(htmlText, imgSelector);

  // rimraf.sync(`${dist}/*`);

  if (fs.statSync(dist).isDirectory()) {
    fs.renameSync(dist, `${archive}/${folderName}`);
    fs.mkdirSync(dist);
  }

  folderName = getTime();

  for (let i = 0, len = urls.length; i < len; i++) {
    const realImgHtmlText = await curl(urls[i]);
    const realImg = findAllUrls(realImgHtmlText, '.main-content');
    
    await download(realImg[0], i);
  }
}

main();

setInterval(main, interval);

// const apiPath = 'https://api.thecatapi.com/v1/images/search';
