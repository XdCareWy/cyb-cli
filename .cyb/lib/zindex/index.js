/**
 * =================================
 * @2018 塞伯坦-CYB前端模块化工程构建工具
 * https://github.com/jd-cyb/cyb-cli
 * =================================
 */

const fs = require('fs')
const path = require('path')
const localIp = require('fez-local-ip')
const common = require('./common')
const config = require('../fezconfig')

module.exports = (applyDir = config.paths.dev.html) => {
  return new Promise((resolve, reject) => {
    let htmlPages = [] //所有html页面

    /**
     * 遍历目录所有文件
     * http://nodejs.cn/api/fs.html#fs_fs_readdirsync_path_options
     */
    const dirAllFiles = (dir) => {
      const collector = {
        'name': dir,
        'type': 'dir',
        'url': '',
        'child': []
      }
      const files = fs.readdirSync(dir) //

      files.forEach((file) => {
        const absolutePath = dir + '/' + file //文件绝对地址

        /**
         * 返回一个stats 实例
         * http://nodejs.cn/api/fs.html#fs_class_fs_stats
         */
        const stats = fs.statSync(absolutePath)
        const url = path.relative(applyDir,absolutePath)

        if (stats.isDirectory() && (stats.isDirectory() !== '.' || stats.isDirectory() !== '..')) {
          //如果是目录 继续遍历
          collector['child'].push(dirAllFiles(absolutePath))
        } else {
          collector['child'].push({
            'name': path.basename(absolutePath),
            'type': 'file',
            'url': url
          })
        }
      })
      return collector
    }

    /**
     * 遍历出所有的html文件
     */
    const showdir = (collector, level) => {
      const file = collector['name']
      const basename = path.basename(file)

      if (collector['type'] == 'dir') {
        collector['child'].forEach((item) => {
          showdir(item, level + 1)
        })
      }

      if (collector['type'] == 'file') {
        if (path.extname(file) === '.html' && basename !== 'zindex.html') {
          let pageItem = {}
          pageItem.name = collector['name']
          pageItem.url = collector['url']
          htmlPages.push(pageItem)
        }
      }
    }

    const ip = localIp.getLocalIP4()
    const collector = dirAllFiles(applyDir)

    showdir(collector, 0)

    const zindexHtml = `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="renderer" content="webkit">
    <meta name="apple-mobile-web-app-capable" content="no" />
    <meta name="format-detection" content="telephone=no">
    <title>${config.projectName} 页面列表</title>
    <link rel="stylesheet" href="./zindex/css/bootstrap.min.css">
    <style>
    .marketing {
        text-align: center;
    }
    .qrcode-img{
        margin: 20px 0;
    }
    .qrcode-img canvas,
    .qrcode-img img,
    .qr-img canvas,
    .qr-img img {
        margin: 0 auto;
    }
    .modal-backdrop {
        filter: alpha(opacity=100)!important;
        opacity: 1!important;
    }
    .jumbotron {
      background-color: #002a32;
      color: #fff;
    }
    </style>
</head>

<body>
    <div class="jumbotron">
        <div class="container">
            <h1>${config.projectName}</h1>
            <p>
                点击按钮链接打开项目页面，也可以扫描二维码在移动端同步开发和调试页面。
            </p>
            <p>
                <a class="btn btn-primary" href="http://cyb.hestudy.com" target="_blank" role="button">官方网站</a>
                <a class="btn btn-warning" href="https://github.com/jd-cyb/cyb-cli/wiki" target="_blank" role="button">Wiki文档</a>
            </p>
        </div>
    </div>
    <div class="container marketing">
        <!-- Three columns of text below the carousel -->
        <div class="row" id="js-qrcode">
        </div>
        <!-- /.row -->
        <!-- FOOTER -->
        <hr>
        <footer>
            <p>© 2018 塞伯坦（Cybertron）- CYB前端模块化工程构建工具</p>
        </footer>
    </div>

    <div id="qrModal" class="modal fade" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="exampleModalLabel"></h4>
          </div>
          <div class="modal-body">
            <div class="qr-img"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
</body>
<script id="qrcode-template" type="text/x-handlebars-template">
    {{#each this}}
    <div class="col-xs-12 col-sm-6 col-md-3 col-lg-3">
        <div class="qrcode-img" data-href="{{url}}"></div>
        <p><a class="btn btn-primary" href="{{url}}" target="_blank">{{url}}</a></p>
    </div>
    {{/each}}
</script>
<script src="./zindex/js/jquery-2.1.3.min.js"></script>
<script src="./zindex/js/bootstrap.min.js"></script>
<script src="./zindex/js/qrcode.min.js"></script>
<script src="./zindex/js/handlebars-v4.0.5.min.js"></script>
<script>
(function() {
    var sourceJson = ${JSON.stringify(htmlPages)};
    var sourceTemp = $("#qrcode-template").html();
    var compileTemplate = Handlebars.compile(sourceTemp);
    var qrcodeHtml = compileTemplate(sourceJson);
    $("#js-qrcode").html(qrcodeHtml);

    $(".qrcode-img").each(function() {
        new QRCode($(this)[0], {
            text: window.location.protocol + "//${ip}" + (window.location.port ? ':' + window.location.port : '') + "/" + $(this).data("href"),
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }).click(function(){
         $('#qrModal').modal();
         $('#qrModal .modal-title').html($(this).data("href"));
         new QRCode($('#qrModal .qr-img')[0], {
            text: window.location.protocol + "//${ip}" + (window.location.port ? ':' + window.location.port : '') + "/" + $(this).data("href"),
            width: 300,
            height: 300,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        $('#qrModal').on('hidden.bs.modal', function (e) {
          $('#qrModal .qr-img').html("");
        });
    });
})();
</script>

</html>
`

    const out = fs.createWriteStream(applyDir + '/zindex.html', {
      encoding: "utf8"
    })

    out.write(zindexHtml, (err) => {
      if (err) console.log(err)
    })
    out.end()

    // 复制目录
    common.exists(path.join(__dirname, './zindex'), applyDir + '/zindex', common.copy)

    resolve()
  })
}
