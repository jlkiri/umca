import rollup, { OutputOptions, InputOptions } from 'rollup';
import fs from 'fs-extra';
import path from 'path';
import sade from 'sade';
import execa from 'execa';
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import buble, { RollupBubleOptions } from '@rollup/plugin-buble';
import resolve from 'rollup-plugin-node-resolve';
import injectHtml from './plugins/rollup-plugin-inject-html';
import md from './plugins/rollup-plugin-md';
import createModuleKeeper from './utils/moduleKeeper';
import createHtmlBuilder from './utils/html';
import isComponent from './utils/isComponent';

const cli = sade('purejsx');

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
    : []

  const requireHtmlPath = hasPages ? "../../index.js" : "../index.js";

  const inputOptions: InputOptions = {
    input: ['sources/index.jsx', ...mdPages],
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

async function build(inputOptions: InputOptions, hasPages: boolean, progress: Ora) {
  const moduleKeeper = createModuleKeeper();

  progress.text = chalk.cyanBright('Compiling sources');
  progress.start();
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

  progress.succeed();
  progress.text = chalk.cyanBright('Building HTML files');
  progress.start();

  const sourceDir = hasPages ? 'sources' : ""
  const entryTest = (name: string) => hasPages ? `sources/${name}` : name;

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

      Object.entries(htmlBuilder.links).forEach(([name, html]) => {
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

      progress.succeed();
    }
  }
}

cli
  .command('create <dir>')
  .describe('Create a new purejsx project in the specified directory')
  .example('create myblog')
  .action(async dir => {
    const progress = ora(chalk.cyanBright('Creating a project')).start();
    const projectPath = `${fs.realpathSync(process.cwd())}/${dir}`;

    await fs.copy(path.resolve(__dirname, 'templates'), projectPath, {
      overwrite: true,
    });

    process.chdir(projectPath);

    const depsToInstall = Object.keys(pkg.dependencies);

    progress.succeed();
    progress.text = chalk.cyanBright('Installing dependencies');

    await execa('yarn', ['add', ...depsToInstall]);

    progress.succeed(chalk.cyanBright('Done!'));
  });

cli
  .command('build')
  .describe('Build the source directory. Expects an `index.js` entry file')
  .action(async () => {
    console.log(chalk.cyanBright('Initiating a build...'));
    const progress = ora();


    const projectPath = `${fs.realpathSync(process.cwd())}`;

    const { inputOptions, hasPages } = buildInputOptions(projectPath);

    await build(inputOptions, hasPages, progress);

    progress.succeed(chalk.cyanBright('Done!'));
  });

cli.parse(process.argv);

export { htmlBuilder };
