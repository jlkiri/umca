import rollup, { OutputOptions, InputOptions } from 'rollup';
import fs from 'fs-extra';
import path from 'path';
import sade from 'sade';
import execa from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import buble, { RollupBubleOptions } from '@rollup/plugin-buble';
import resolve from 'rollup-plugin-node-resolve';
import injectHtml from './plugins/rollup-plugin-inject-html';
import md from './plugins/rollup-plugin-md';
import createModuleKeeper from './utils/moduleKeeper';
import createHtmlBuilder from './utils/html';
import isComponent from './utils/isComponent';
import { getAuthorName, setAuthorName, getInstallCmd } from './helpers';
import messages from './messages';

const cli = sade('awave');
const cyan = chalk.cyanBright;
const green = chalk.green;

const pkg = fs.readJSONSync(path.resolve(__dirname, '../package.json'));

const OUTPUT_PATH = `${process.cwd()}/public/`;
const CACHE_PATH = `${__dirname}/.cache/`;

const outputOptions: OutputOptions = {
  dir: CACHE_PATH,
  format: 'cjs',
};

function buildInputOptions(projectPath: string) {
  const hasPages = fs.existsSync(`${projectPath}/pages`);
  const mdPages = hasPages
    ? fs.readdirSync(`${projectPath}/pages`).map(page => `pages/${page}`)
    : [];

  const requireHtmlPath = hasPages ? '../../index.js' : '../index.js';

  const inputOptions: InputOptions = {
    input: ['src/index.jsx', ...mdPages],
    preserveModules: true,
    plugins: [
      resolve({
        extensions: ['.mjs', '.js', '.jsx', '.md', '.json'],
      }),
      md(),
      buble({
        jsx: 'htmlBuilder.renderToHTMLString',
      } as RollupBubleOptions),
      injectHtml(requireHtmlPath),
    ],
  };

  return { inputOptions, hasPages };
}

const htmlBuilder = createHtmlBuilder();

async function build(inputOptions: InputOptions, hasPages: boolean) {
  const moduleKeeper = createModuleKeeper();

  const compileProgress = ora(cyan(messages.compileInit)).start();

  const bundle = await rollup.rollup(inputOptions);
  const { output } = await bundle.generate(outputOptions);

  for (const chunkOrAsset of output) {
    if (chunkOrAsset.type === 'chunk') {
      const notMd = !/\.md\.js$/.test(chunkOrAsset.fileName);
      if (chunkOrAsset.isEntry && notMd) {
        moduleKeeper.saveEntryFileName(chunkOrAsset.fileName);
      }
    }
  }

  await bundle.write(outputOptions);

  compileProgress.succeed(cyan(messages.compileSuccess));

  const htmlProgress = ora(cyan(messages.htmlInit)).start();

  const sourceDir = hasPages ? 'src' : '';
  const entryTest = (name: string) => (hasPages ? `src/${name}` : name);

  const componentPath = path.join(CACHE_PATH, sourceDir);
  const components = fs.readdirSync(componentPath);

  for (const file of components) {
    const isEntry = moduleKeeper.isEntry(entryTest(file));
    if (isEntry) {
      const htmlFileName = path.basename(file, '.js');

      const htmlObject = require(path.join(CACHE_PATH, sourceDir, file));
      const { htmlString } = isComponent(htmlObject)
        ? htmlObject(null)
        : htmlObject;

      if (!fs.existsSync(OUTPUT_PATH)) {
        fs.mkdirSync(OUTPUT_PATH);
      }

      let prefetches: string[] = [];

      // TODO: fix links (make it work on transitions from sub-pages to sub-pages)

      Object.entries(htmlBuilder.globalLinks).forEach(([name, html]) => {
        const htmlContent = `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
        fs.writeFileSync(`${path.join(OUTPUT_PATH, name)}.html`, htmlContent);
        prefetches.push(name);
      });

      const headPrefetch = prefetches.map(
        name => `<link rel="prefetch" href="${name}.html" >`
      );

      const htmlContent = `<!DOCTYPE html><html><head>${headPrefetch}</head><body>${htmlString}</body></html>`;

      fs.writeFileSync(
        `${path.join(OUTPUT_PATH, htmlFileName)}.html`,
        htmlContent
      );

      htmlProgress.succeed(messages.htmlSuccess);
    }
  }
}

cli
  .command('create <dir>')
  .describe('Create a new purejsx project in the specified directory')
  .example('create myblog')
  .action(async dir => {
    const bootProgress = ora(cyan(messages.generateInit)).start();
    const projectPath = `${fs.realpathSync(process.cwd())}/${dir}`;

    await fs.copy(path.resolve(__dirname, 'templates'), projectPath, {
      overwrite: true,
    });

    process.chdir(projectPath);

    let author = getAuthorName();

    if (!author) {
      bootProgress.stop();
      const author = await prompt({
        type: 'input',
        name: 'author',
        message: 'Who is the package author?',
      });
      setAuthorName((author as any).author);
      bootProgress.start();
    }

    const pkgJson = {
      name: dir,
      version: '0.1.0',
      license: 'MIT',
      author: author,
      scripts: {
        build: 'awave build',
      },
      prettier: {
        printWidth: 80,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      },
    };

    await fs.outputJSON(path.resolve(projectPath, 'package.json'), pkgJson);

    const depsToInstall = Object.keys(pkg.dependencies);

    bootProgress.succeed(cyan(messages.generateSuccess));

    const installProgress = ora(
      cyan(messages.installInit)
    ).start();

    const cmd = getInstallCmd();
    const addOrInstall = cmd === 'yarn' ? 'add' : 'install';

    await execa(cmd, [addOrInstall, ...depsToInstall]);

    installProgress.succeed(cyan(messages.installSuccess));

    console.log(green('Done!'), cyan(messages.ready));
  });

cli
  .command('build')
  .describe('Build the source directory. Expects an `index.js` entry file')
  .action(async () => {
    console.log(cyan(messages.buildInit));
    const projectPath = `${fs.realpathSync(process.cwd())}`;
    const { inputOptions, hasPages } = buildInputOptions(projectPath);

    await build(inputOptions, hasPages);
  });

cli.parse(process.argv);

export { htmlBuilder };
