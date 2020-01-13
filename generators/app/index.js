'use strict'

const generators      = require('yeoman-generator')
const updateNotifier  = require('update-notifier')
const pkg             = require('../../package.json')
const jsonPretty      = require('json-pretty')
const fs              = require('fs')
const helper          = require('./helper.js')
const inquirer        = require('inquirer')
const chalk           = require('chalk')
const clear           = require('clear')
const plugins         = require('./assets.json')
const download        = require('download')
const log             = console.log

const pwd = process.env.PWD || process.cwd()

const paths = {
    js: './dev/js/vendor/',
    scss: './dev/sass/plugin/',
    font: './dev/webfonts/'
}

const msgs = {
    boilerplate: 'Boilerplate may have been installed.',
    installFirst: 'Install boilerplate first.',
    downloading: 'Downloading asset(s) from cdn...',
    created: 'asset will be created in'
}

const pluginScssFile = `${pwd}/dev/sass/plugin/_plugin.scss`

module.exports = class extends generators {
    initializing() {
        // checkUpdate
        clear()
        updateNotifier({pkg: pkg}).notify()

        // showCurrentVersion
        log(chalk.white.underline(`You are running ${pkg.name} version ${pkg.version}\n`))

        // buildMenuList
        this.choices = []
        this.choices.push('boilerplate')
        this.choices.push('modernizr')

        plugins.forEach( (plugin, i) => {
            this.choices.push(`${plugin.name} - ${chalk.underline(plugin.url)}`)
        })

        this.choices.push(new inquirer.Separator())
        this.choices.push('exit')
        this.choices.push(new inquirer.Separator())
    }

    async prompting() {
        this.answers = await this.prompt([{
            type    : 'list',
            name    : 'options',
            message: 'What can I do for you?',
            choices: this.choices
        }])
    }

    writing() {
        if ( this.answers.options === 'exit' ) {
            process.exit(1)
        }

        const PACKAGE_FILE = this.destinationPath('./package.json')
        let answer = this.answers.options
        let choice = plugins.filter( plugin => plugin.name === answer.split(' - ')[0] )[0]

        if ( answer === 'boilerplate' ) {
            try {
                fs.openSync(PACKAGE_FILE, 'r')
                log(msgs.boilerplate)
                process.exit(1)
            } catch (e) {
                boilerplate.bind(this)()
            }
        } else if (answer === 'modernizr') {
            try {
                fs.openSync(PACKAGE_FILE, 'r')
            } catch(e) {
                log(msgs.installFirst)
                process.exit(1)
            }
            addModernizr.bind(this)()
        } else {
            try {
                fs.openSync(PACKAGE_FILE, 'r')
            } catch(e) {
                log(msgs.installFirst)
                process.exit(1)
            }

            log(msgs.downloading)

            choice.assets.forEach( (asset, index) => {
                let filetype

                if ( helper.isJs(asset) )
                    filetype = 'js'
                else if ( helper.isCss(asset) )
                    filetype = 'scss'
                else if ( helper.isFont(asset) )
                    filetype = 'font'

                if ( filetype !== 'scss' ) {
                    download(asset, this.destinationPath(paths[filetype])).then(() => {
                        // console.log('downloaded')
                    })
                } else {
                    let filename = helper.getFilename(asset)
                    let pluginScssPath = `${pwd}/dev/sass/plugin/`

                    download(asset, this.destinationPath(paths[filetype])).then(() => {

                        let content = fs.readFileSync(`${pluginScssFile}`, {
                            encoding: 'utf8'
                        })
                        content += `\n@import "${filename}";`
                        // console.log(helper.getFilename(filename), filename)

                        fs.writeFileSync(`${pluginScssFile}`, content)

                        fs.rename(`${pluginScssPath}${filename}.css`, `${pluginScssPath}_${filename}.scss`, (err)=> {
                            if (err) throw err
                        })
                    })
                }

                log(`${chalk.green(msgs.created)} ${paths[filetype]}`)
            })
        }

        function addModernizr() {
            this.fs.copy(
                this.templatePath('_modernizr'),
                this.destinationPath('./dev/js/vendor/modernizr.js')
            )
        }

        function boilerplate() {
            this.fs.copy(
                this.templatePath(`${answer}/**/*`),
                this.destinationPath('./')
            )

            this.fs.copy(
                this.templatePath('_gitignore'),
                this.destinationPath('./.gitignore')
            )

            this.fs.copy(
                this.templatePath('_editorconfig'),
                this.destinationPath('./.editorconfig')
            )

            this.fs.copy(
                this.templatePath('_gitlab-ci'),
                this.destinationPath('../.gitlab-ci.yml')
            )

            fs.mkdirSync(`./_partials`)
            this.fs.write(`./_partials/head.php`, '')
            this.fs.write(`./_partials/header.php`, '')
            this.fs.write(`./_partials/footer.php`, '')
            this.fs.write(`./_partials/scripts.php`, '')
        }
    }
}
