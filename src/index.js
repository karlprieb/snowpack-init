const commander = require('commander')
const shell = require('shelljs')
const ora = require('ora')
var jsonfile = require('jsonfile')
const { red, cyan, green, bold } = require('kleur') // eslint-disable-line
const envinfo = require('envinfo')
let fs = require('fs')
let path = require('path')

const createPikaApp = appName => {
  return new Promise(resolve => {
    if (appName) {
      if (path.isAbsolute(appName)) {
        shell.exec(`mkdir ${appName}`, () => {
          console.log()
          console.log(green().bold('Welcome to create-pika-app'))
          console.log()
          console.log(`Creating app: ${cyan().bold(appName)}\n`)
          resolve(true)
        })
      } else {
        shell.exec(`cd ${process.cwd()} && mkdir ${appName}`, () => {
          console.log(green().bold('Welcome to create-pika-app'))
          console.log()
          console.log(`Creating app: ${cyan().bold(appName)}\n`)
          resolve(true)
        })
      }
    } else {
      console.log(bold().red('\nNo app name was provided.'))
      console.log(bold('\nUsage:'))
      console.log('\ncreate-pika-app ', 'app-name\n'.cyan)
      resolve(false)
    }
  })
}

const initApp = appDirectory => {
  return new Promise(resolve => {
    shell.exec(`cd ${appDirectory} && npm init --yes > /dev/null`, () => {
      const packaged = jsonfile.readFileSync(`${appDirectory}/package.json`)
      packaged.scripts.build = 'pika-web --dest dist/web_modules'
      packaged.scripts['build:esm'] =
        'npm run build:ts && npm run build:esm && npm run build:js && npm run copy'
      packaged.scripts['build:js'] =
        "babel dist -d dist --ignore 'dist/web_modules/*.js'"
      packaged.scripts['build:js:watch'] =
        "babel dist -d dist --ignore 'dist/web_modules/*.js' --watch"
      packaged.scripts['build:ts'] = 'rm -rf dist && tsc'
      packaged.scripts['build:ts:watch'] = 'tsc -w'
      packaged.scripts.copy =
        "copyfiles 'src/*.html' 'src/**/*.gif' 'src/*.css' dist -u 1"
      packaged.scripts.dev =
        "npm run build && concurrently 'npm run build:ts:watch' 'npm run build:js:watch' 'serve -s dist'"
      packaged.scripts.lint =
        "eslint --ext .ts,.tsx src --ignore 'web_modules/**/*.js'"
      packaged.scripts.prestart = 'npm run build'
      packaged.scripts.start = 'serve -s dist'
      jsonfile.writeFileSync(`${appDirectory}/package.json`, packaged, {
        spaces: 2,
      })
      const scriptsPackaged = jsonfile.readFileSync(
        `${appDirectory}/package.json`
      )
      scriptsPackaged['@pika/web'] = {
        webDependencies: [
          'emotion',
          'preact',
          'preact-compat',
          'preact-emotion',
          'preact-router',
        ],
      }
      jsonfile.writeFileSync(`${appDirectory}/package.json`, scriptsPackaged, {
        spaces: 2,
      })
      resolve()
    })
  })
}

const copyTemplates = appDirectory => {
  const copyDirectoryRecursiveSync = (source, target, move) => {
    if (!fs.lstatSync(source).isDirectory()) return

    var operation = move ? fs.renameSync : fs.copyFileSync
    fs.readdirSync(source).forEach(function(itemName) {
      var sourcePath = path.join(source, itemName)
      var targetPath = path.join(target, itemName)

      if (fs.lstatSync(sourcePath).isDirectory()) {
        fs.mkdirSync(targetPath)
        copyDirectoryRecursiveSync(sourcePath, targetPath)
      } else {
        operation(sourcePath, targetPath)
      }
    })
  }

  const currentDir = path.dirname(fs.realpathSync(__dirname))

  copyDirectoryRecursiveSync(`${currentDir}/assets/templates/`, appDirectory)
}

const installDependencies = appDirectory => {
  return new Promise(resolve => {
    const installDepSpinner = ora({
      text: ` ${bold().white('create-pika-app')} installing... ${cyan(
        'preact'
      )}, ${cyan('preact-compat')}, ${cyan('emotion')}, ${cyan(
        'preact-emotion'
      )}, and ${cyan('preact-router')}`,
    }).start()
    shell.exec(
      `cd ${appDirectory} && npm install --silent --save preact preact-compat preact-emotion preact-router emotion > /dev/null`,
      () => {
        installDepSpinner.succeed()
        resolve()
      }
    )
  })
}

const installDevDependencies = appDirectory => {
  return new Promise(resolve => {
    const installDevDepSpinner = ora({
      text: ` ${bold().white('create-pika-app')} installing... ${cyan(
        '@pika/web'
      )}, ${cyan('typescript')}, ${cyan('eslint')}, ${cyan('serve')}, ${cyan(
        'babel'
      )}, and other dev dependencies`,
    }).start()
    shell.exec(
      `cd ${appDirectory} && npm install --silent -D @babel/cli @babel/core @babel/plugin-proposal-class-properties @babel/plugin-proposal-object-rest-spread @babel/plugin-transform-react-jsx @babel/preset-env @babel/preset-react @babel/preset-typescript @pika/web @typescript-eslint/eslint-plugin @typescript-eslint/parser babel-plugin-import-pika-web babel-plugin-module-resolver concurrently copyfiles prettier eslint eslint-config-airbnb-typescript eslint-config-prettier eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-prettier eslint-plugin-react serve typescript > /dev/null`,
      () => {
        installDevDepSpinner.succeed()
        resolve()
      }
    )
  })
}

const run = async () => {
  let appName
  const program = new commander.Command(process.argv[2])
    .version('1.0.0')
    .arguments('<project-directory>')
    .usage(`${green('<project-directory>')} [options]`)
    .action(name => {
      appName = name
    })
    .option('--verbose', 'print additional logs')
    .option('--info', 'print environment debug info')
    .allowUnknownOption()
    .on('--help', () => {
      console.log(`    Only ${green('<project-directory>')} is required.`)
      console.log()
      console.log(
        `    If you have any problems, do not hesitate to file an issue:`
      )
      console.log(
        `      ${cyan('https://github.com/ndom91/create-pika-app/issues/new')}`
      )
      console.log()
    })
    .parse(process.argv)

  if (program.info) {
    console.log(bold('\nEnvironment Info:'))
    return envinfo
      .run(
        {
          System: ['OS', 'CPU'],
          Binaries: ['Node', 'npm'],
          Browsers: [
            'Chrome',
            'Edge',
            'Internet Explorer',
            'Firefox',
            'Safari',
          ],
          npmPackages: [
            'preact',
            'preact-compat',
            '@pika/web',
            'preact-emotion',
          ],
          npmGlobalPackages: ['create-pika-app'],
        },
        {
          duplicates: true,
          showNotFound: true,
        }
      )
      .then(console.log)
  }

  let appDirectory = `${process.cwd()}/${appName}`
  if (typeof appname === 'string' && path.isAbsolute(appName)) {
    appDirectory = appName
  }

  if (typeof appName === 'undefined') {
    console.error('Please specify the project name:')
    console.log(`  ${cyan(program.name())} ${green('<project-directory>')}`)
    console.log()
    console.log('For example:')
    console.log(`  ${cyan(program.name())} ${green('my-pika-app')}`)
    console.log()
    console.log(`Run ${cyan(`${program.name()} --help`)} to see all options.`)
  }

  let success = await createPikaApp(appName)
  if (!success && typeof appName !== undefined) {
    console.log(
      bold().red(
        'Something went wrong while trying to create a new Preact app using create-pika-app'
      )
    )
    return false
  }
  await initApp(appDirectory)
  await copyTemplates(appDirectory)
  await installDependencies(appDirectory)
  await installDevDependencies(appDirectory)
  console.log()
  console.log(`Application ready at ${bold(appDirectory)}!`)
  console.log()
  console.log(green('✔️ ') + bold(' Complete!'))
}

export default run()
