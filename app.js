const fs = require('fs');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { ncp } = require('ncp');
const { noop } = require('lodash');
const moment = require('moment');
const rimraf = require('rimraf');

const types = ['cat', 'dog', 'avengers', 'cute', 'tom and jerry',
  'Alvin and the Chipmunks', 'minions', 'League Of Legends', 'Paladins',
  'penguin', 'music dj', 'Music Gorillaz', 'Wreck-It Ralph', 'Hotel Transylvania',
];
const downloadDir = './download';
const archiveDir = './archive';
const domain = 'https://wall.alphacoders.com';

const  hour = 1000 * 60 * 60; // 一个小时
const interval = hour * 2;

const log = console.log;
console.log = function (...args) {
  log.call(console, getTime(), '---', ...args);
};

// https://wall.alphacoders.com/by_category.php?id=9&name=Dark+Wallpapers
function getApiUrl(type, page = 1) {
  return `${domain}/search.php?search=${type}&page=${page}`;
}

function getTime() {
  return moment().format('YYYY-MM-DD HH.mm');
}

function checkDirIsExist(dir) {
  if(!fs.existsSync(dir)) {
    log('mkdir', dir);
    fs.mkdirSync(dir);
  }
}

async function download(url, i) {
  const fileName = getTime() + '---' + i;

  await axios({
    method: 'get',
    url,
    responseType: 'stream',
  }).then(function (response) {
    response.data.pipe(fs.createWriteStream(`${downloadDir}/${fileName}.jpeg`));
  });
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

/**
 * 从数组中获取随机值
 */
function getRandom(arr) {
  const length = arr.length;
  const random = Math.floor(Math.random() * length);

  return arr[random] || '';
}

function getPageNumber(htmlText) {
  const pageSelector = '.center .hidden-xs.hidden-sm .pagination li a';
  const dom = new JSDOM(htmlText);

  const pagesNumber = dom.window.document.querySelectorAll(pageSelector).length;

  const random = Math.floor(Math.random() * pagesNumber);

  return random;
}

/** 缓存中获取图片 */
function copyRandomCache() {
  checkDirIsExist(archiveDir);
  const cacheDir = fs.readdirSync(archiveDir);
  const randomCacheDirName = getRandom(cacheDir).replace(/\s/, '\ ');
  if (!randomCacheDirName) {
    return main();
  }

  if (randomCacheDirName === '.DS_Store') {
    return copyRandomCache();
  }

  const cachePictureDir = `${archiveDir}/${randomCacheDirName}`;
  ncp(cachePictureDir, downloadDir, noop);
  log('获取缓存图片', cachePictureDir);
}

// 用于记录上一次的类型和页数
let folderName = '';

async function main() {
  try {
    const type = getRandom(types);
    log('开始拉取图片啦, 主题:', type)
    // 先 curl 获取 page
    let url = getApiUrl(type);
    let htmlText = await curl(url);
    const page = getPageNumber(htmlText);

    // 真正 curl 的地址
    url = getApiUrl(type, page);
    log('真正的curl地址', url);
    const tmpFolder = `${type}${page}`;

    if (folderName && fs.existsSync(`${archiveDir}/${tmpFolder}`)) {
      if (Math.random() < 0.3) {
        return main();
      } else {
        return copyRandomCache();
      }
    }

    checkDirIsExist(downloadDir);

    // 如果 download 文件夹有文件，就移动一下
    let downloadFiles = fs.readdirSync(downloadDir);
    downloadFiles = downloadFiles.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));

    const targetDir = `${archiveDir}/${folderName}`;
    if (folderName && !fs.existsSync(targetDir) && downloadFiles.length) {
      fs.renameSync(downloadDir, targetDir);
    } else {
      rimraf.sync(downloadDir);
    }

    fs.mkdirSync(downloadDir);

    folderName = tmpFolder;

    htmlText = await curl(url);

    const imgSelector = '.thumb-container .boxgrid a';
    const urls = findAllUrls(htmlText, imgSelector);

    log('开始下载图片啦', url);

    for (let i = 0, len = urls.length; i < len; i++) {
      const realImgHtmlText = await curl(urls[i]);
      const realImg = findAllUrls(realImgHtmlText, '.main-content');

      await download(realImg[0], i);
    }
    log('下载完成啦', url);
  } catch (e) {
    log('main 函数报错: ', e);
    copyRandomCache();
  }
}

main();

setInterval(main, interval);

// const apiPath = 'https://api.thecatapi.com/v1/images/search';
