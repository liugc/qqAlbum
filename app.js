const request = require("request");
const Ora = require("ora");
const path = require("path");
const fs = require("fs");

let cookie = "";  // 你的 cookie

let distQQ = "";  // 目标 qq 号

let psk = getPsk(cookie);
let user = getUser(cookie);
let spinner = new Ora({
  text: '开始下载',
  spinner: {
		"interval": 125,
		"frames": [
			"∙∙∙",
			"●∙∙",
			"∙●∙",
			"∙∙●",
			"∙∙∙"
		]
	}
});

downAll();

async function downAll() {
  spinner.start();
  let dirs = await getDir();
  let len = dirs.length;
  if (!fs.existsSync(distQQ)) {
    fs.mkdirSync(distQQ);
  }
  for (let i=0; i<len; i++) {
    await downDir(dirs[i]);
  }
}

function getDir() {
  return new Promise((resolve, reject) => {
    request({
      url: `https://h5.qzone.qq.com/proxy/domain/photo.qzone.qq.com/fcgi-bin/fcg_list_album_v3?g_tk=${psk}&hostUin=${distQQ}&uin=${user}&inCharset=utf-8&outCharset=utf-8`,
      headers: {
        cookie
      }
    }, (err, res, body) => {
      if (err) throw err;
      let _Callback = (obj) => {
        let dirs = [];
        let list = obj.data.albumListModeSort;
        if (list && list.length > 0) {
          list.forEach((item) => {
            dirs.push(item.id);
          });
          resolve(dirs);
        } else {
          spinner.fail("没权限");
        }
      }
      eval(body);
    });
  });
}

function downDir(topicId) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://h5.qzone.qq.com/proxy/domain/photo.qzone.qq.com/fcgi-bin/cgi_list_photo?g_tk=${psk}&hostUin=${distQQ}&topicId=${topicId}&uin=${user}&pageStart=0&pageNum=500&inCharset=utf-8&outCharset=utf-8`,
      headers: {
        cookie
      }
    }, (err, res, body) => {
      let _Callback = async (obj) => {
        let data = obj.data;
        if (data.topic && data.photoList) {
          let dir = data.topic.name;
          dir = dir.replace(/\\|\/|:|\*|\?|"|\<|\>|\|/g, "");
          let list = data.photoList;
          let imgs = [];
          list.forEach((item) => {
            imgs.push(item.url);
          });
          if (!fs.existsSync(path.join(distQQ, dir))) {
            fs.mkdirSync(path.join(distQQ, dir));
          }
          let len = imgs.length;
          spinner.start();
          for (let i=0; i<len; i++) {
            spinner.text = `正在下载【${dir}】：第 ${i+1} 张`;
            await downImgPromise(dir, imgs[i]);
          }
          spinner.succeed(`【${dir}】下载成功，共 ${len} 张`);
        }
        resolve();
      }
      eval(body);
    });
  })
}

function downImg(dir, url, resolve) {
  request({
    url,
    headers: {
      cookie
    }
  }).on("response", (res) => {
    let name = +new Date() + ".jpg";
    res.pipe(fs.createWriteStream(path.join(distQQ, dir, name)));
    resolve();
  }).on("error", (err) => {
    spinner.text = "网络问题，10s后继续下载";
    setTimeout(function() {
      downImg(dir, url, resolve);
    }, 10000);
  });
}

function downImgPromise(dir, url) {
  return new Promise((resolve, reject) => {
      downImg(dir, url, resolve);
  });
}

function getPsk(cookie) {
  let cooks = cookie.split(";");
  let skey = "";
  cooks.forEach((cook) => {
    let item = cook.split("=");
    if (item[0].replace(/^\s+|\s+$/g, "") == "p_skey") {
      skey = item[1];
    }
  });
  let hash = 5381;
  for(let i = 0,len = skey.length; i <len; ++i){
    hash += (hash << 5) + skey.charAt(i).charCodeAt();
  }
  return (hash & 0x7fffffff);
}

function getUser(cookie) {
  let cooks = cookie.split(";");
  let user = "";
  cooks.forEach((cook) => {
    let item = cook.split("=");
    if (item[0].replace(/^\s+|\s+$/g, "") == "o_cookie") {
      user = item[1];
    }
  });
  return user;
}