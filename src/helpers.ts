import shell from 'shelljs';

import execa from 'execa';

export type InstallCommand = 'yarn' | 'npm';

export function getInstallCmd(): InstallCommand {
  let cmd: InstallCommand;

  try {
    execa.sync('yarn', ['--version']);
    cmd = 'yarn';
  } catch (e) {
    cmd = 'npm';
  }

  return cmd;
}

export function getAuthorName() {
  let author = '';

  author = shell
    .exec('npm config get init-author-name', { silent: true })
    .stdout.trim();

  if (author) return author;

  author = shell
    .exec('git config --global user.name', { silent: true })
    .stdout.trim();

  if (author) {
    setAuthorName(author);
    return author;
  }

  return author;
}

export function setAuthorName(author: string) {
  shell.exec(`npm config set init-author-name "${author}"`, { silent: true });
}

export function isCSS(filename: string) {
  return /\.css$/.test(filename) || /\.css\..*$/.test(filename);
}