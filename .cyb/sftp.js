/**
 * =================================
 * @2018 塞伯坦-CYB前端模块化工程构建工具
 * https://github.com/jd-cyb/cyb-cli
 * =================================
 */

/**
 * ---------------------------------
 * 通过ssh方式部署上线代码
 * ---------------------------------
 */

const fs = require('fs')
const path = require('path')
const fancyLog = require('fancy-log')
const chalk = require('chalk')
const through2 = require('through2')
const Client = require('ssh2').Client
const async = require('async')
const vfs = require('vinyl-fs')
const inquirer = require('inquirer')
const config = require('./lib/fezconfig')
const isWin = /^win/.test(process.platform)

const uploader = (sftp, sftpConfig) => {

  return through2.obj(function (file, enc, cb) {

    const stats = fs.statSync(file.path)

    let writeStreamPath = path.join(sftpConfig.remotePath, file.relative)
    if (isWin) {
      writeStreamPath = writeStreamPath.replace(/\\/g, '/')
    }

    if (stats.isDirectory() && (stats.isDirectory() !== '.' || stats.isDirectory() !== '..')) {
      sftp.mkdir(writeStreamPath, {
        mode: '0755'
      }, function (err) {
        if (!err) {
          fancyLog(chalk.yellow(`创建目录：${file.relative}`))
        }
        cb()
      })
    } else {
      let readStream = fs.createReadStream(file.path)
      let writeStream = sftp.createWriteStream(writeStreamPath)

      writeStream.on('close', function () {
        fancyLog(chalk.green(`成功上传：${file.relative}`))
        cb()
      })

      readStream.pipe(writeStream)
    }
  })
}

module.exports = () => {
  fancyLog(chalk.magenta('Start sftp...'))

  function sftpUpload() {
    const sftpConfig = config.sftp
    inquirer.prompt([{
        type: 'input',
        name: 'host',
        message: '请填写服务器IP地址：',
        when: sftpConfig.host === ''
      }, {
        type: 'input',
        name: 'port',
        message: '请填写服务器端口号：',
        default: '22',
        when: sftpConfig.port === ''
      }, {
        type: 'input',
        name: 'user',
        message: '请填写服务器用户名：',
        when: sftpConfig.user === ''
      }, {
        type: 'password',
        name: 'password',
        message: '请填写服务器密码：',
        when: sftpConfig.password === ''
      }, {
        type: 'input',
        name: 'remotePath',
        message: '请填写服务器目标路径：',
        default: '/var/www/html',
        when: sftpConfig.remotePath === ''
      }])
      .then(answers => {
        Object.assign(sftpConfig, answers)
        const distPath = sftpConfig.includeHtml ? `${config.paths.dist.dir}/**/*` : [`${config.paths.dist.dir}/**/*`, `!${config.paths.dist.dir}/**/*.html`]
        const connSettings = {
          host: sftpConfig.host,
          port: sftpConfig.port, // Normal is 22 port
          username: sftpConfig.user,
          password: sftpConfig.password
          // You can use a key file too, read the ssh2 documentation
        }
        const conn = new Client()

        conn.on('authentication', function (ctx) {
          console.log(ctx)
        }).on('ready', function () {
          conn.sftp(function (err, sftp) {
            if (!err) {
              sftp.stat(sftpConfig.remotePath, function (err, stats) {
                if (stats && stats.isDirectory()) {
                  vfs.src(distPath)
                    .pipe(uploader(sftp, sftpConfig))
                    .on('data', function (data) {
                      // console.log(data)
                    })
                    .on('end', function () {
                      conn.end()
                      // conn.close()
                      fancyLog(chalk.magenta('sftp succeed.'))
                    })
                } else {
                  fancyLog.error(chalk.red(`上传目录不存在`))
                  fancyLog.error(chalk.red(`请在服务器上先创建目录：${sftpConfig.remotePath}`))
                  conn.end()
                }
              })
            }
          })
        }).on('error', function (err) {
          if (err.errno === 'ENETUNREACH') {
            fancyLog.error(chalk.red('请检查网络是否连接正常。'))
          } else if (err.level === 'client-authentication') {
            fancyLog.error(chalk.red('用户名或密码不正确'))
          } else {
            fancyLog.error(chalk.red(`请确认可以正常联通远程服务器：IP/${sftpConfig.host} 端口号/${sftpConfig.port}`))
          }
        }).connect(connSettings)
      }).catch((error) => {
        if (error) {
          throw new Error(error)
        }
      })
  }
  sftpUpload()
}
