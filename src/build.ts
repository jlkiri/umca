import rollup, { OutputOptions, InputOptions } from 'rollup';
import fs from 'fs-extra';
import path from 'path';
import sade from 'sade';
import execa from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import Purgecss from 'purgecss';
import postcss from '@jlkiri/rollup-plugin-postcss';
import buble, { RollupBubleOptions } from '@rollup/plugin-buble';
import resolve from 'rollup-plugin-node-resolve';
import injectHtml from './plugins/rollup-plugin-inject-html';
import md from './plugins/rollup-plugin-md';
import createModuleKeeper from './utils/moduleKeeper';
import createHtmlBuilder, { Component } from './utils/html';
import { getAuthorName, setAuthorName, isCSS, getInstallCmd } from './helpers';
import messages from './messages';
import CSSExtractor from './utils/cssExtractor';

const cli = sade('umca');
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

  const requireHtmlPath = '../../index.js';

  const srcs = fs.readdirSync(`${projectPath}/src`).map(file => `src/${file}`);

  const inputOptions: InputOptions = {
    input: [...srcs, ...mdPages],
    preserveModules: true,
    plugins: [
      resolve({
        extensions: ['.mjs', '.js', '.jsx', '.md', '.json'],
      }),
      md(),
      buble({
        jsx: 'htmlBuilder.renderToHTMLString',
        exclude: '**/*.css',
        transforms: {
          modules: false,
        },
      } as RollupBubleOptions),
      injectHtml(requireHtmlPath),
      postcss({
        plugins: [require('tailwindcss')],
      }),
    ],
  };

  return { inputOptions, hasPages };
}

const htmlBuilder = createHtmlBuilder();

async function build(inputOptions: InputOptions) {
  const moduleKeeper = createModuleKeeper();

  const compileProgress = ora(cyan(messages.compileInit)).start();

  try {
    const bundle = await rollup.rollup(inputOptions);
    const { output } = await bundle.generate(outputOptions);

    for (const chunkOrAsset of output) {
      if (chunkOrAsset.type === 'chunk') {
        const notMd = !/\.md\.js$/.test(chunkOrAsset.fileName);
        const isEntry = /index\.js$/.test(chunkOrAsset.fileName);
        if (isEntry && notMd) {
          moduleKeeper.saveEntryFileName(chunkOrAsset.fileName);
        }
      }
    }

    await bundle.write(outputOptions);

    compileProgress.succeed(cyan(messages.compileSuccess));

    const htmlProgress = ora(cyan(messages.htmlInit)).start();

    const sourceOutputDir = 'src';
    const entryTest = (name: string) => `src/${name}`;

    const componentPath = path.join(CACHE_PATH, sourceOutputDir);
    const components = fs.readdirSync(componentPath);

    const entryModule = components.find(mod =>
      moduleKeeper.isEntry(entryTest(mod))
    );

    if (!entryModule) return;

    let indexComponentName: string;

    components.forEach(component => {
      if (isCSS(component)) return;

      const renderResult: Component = require(path.join(
        CACHE_PATH,
        sourceOutputDir,
        component
      ));

      if (component === entryModule) {
        indexComponentName = renderResult.name.toLowerCase();
      }

      htmlBuilder.renderToHTMLString(renderResult, null);
    });

    if (!fs.existsSync(OUTPUT_PATH)) {
      fs.mkdirSync(OUTPUT_PATH);
    }

    const cssString = require(path.join(
      CACHE_PATH,
      sourceOutputDir,
      'styles.css.js'
    ));

    fs.writeFileSync(path.join(OUTPUT_PATH, 'index.css'), cssString);

    Object.entries(htmlBuilder.globalLinks).forEach(([component, value]) => {
      const isIndexComponent = component === indexComponentName;

      if (!value.isLinkedTo && !isIndexComponent) return;

      const pageName = isIndexComponent ? 'index' : component;
      const componentHtml = value.htmlString;
      const prefetches = value.localLinks.map(
        link =>
          `<link rel="prefetch" href="${
            link === indexComponentName ? 'index' : link
          }.html">`
      );
      const css = `<link rel="stylesheet" href="index.css" />`;
      const htmlContent = `<!DOCTYPE html><html><head>${css}${prefetches.join(
        ''
      )}</head><body>${componentHtml}</body></html>`;
      fs.writeFileSync(`${path.join(OUTPUT_PATH, pageName)}.html`, htmlContent);
    });

    const purgecss = new Purgecss({
      content: [`${path.join(OUTPUT_PATH)}/*.html`],
      css: [`${path.join(OUTPUT_PATH)}/index.css`],
      extractors: [
        {
          extractor: CSSExtractor,
          extensions: ['html'],
        },
      ],
    });

    const purgecssResult = purgecss.purge();

    for (const result of purgecssResult) {
      if (result.file && isCSS(result.file)) {
        fs.writeFileSync(result.file, result.css);
      }
    }

    htmlProgress.succeed(messages.htmlSuccess);
  } catch (e) {
    console.error('Build error: ', e);
  }
}

cli
  .command('create <dir>')
  .describe('Create a new umca project in the specified directory')
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
        build: 'umca build',
        start: 'serve public',
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

    const installProgress = ora(cyan(messages.installInit)).start();

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
    const { inputOptions } = buildInputOptions(projectPath);

    await build(inputOptions);
  });

cli.parse(process.argv);

export { htmlBuilder };
