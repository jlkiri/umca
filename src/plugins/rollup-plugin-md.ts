import marked, { MarkedOptions } from 'marked';
import rollup from 'rollup';
import { createFilter } from 'rollup-pluginutils';

export interface MdPluginOptions {
  include?: string[],
  exclude?: string[],
  marked?: MarkedOptions
}

function isDummyMd(id: string) {
  return /dummy/.test(id);
}

export default function md(options: MdPluginOptions = {}): rollup.Plugin {
  const filter = createFilter(options.include || ['**/*.md'], options.exclude);

  if (options.marked) {
    marked.setOptions(options.marked)
  }

  return {
    name: 'md',

    transform(md, id) {
      if (isDummyMd(id)) return null;
      if (!/\.md$/.test(id)) return null;
      if (!filter(id)) return null;

      const data = marked(md);
      return {
        code: `export default ${JSON.stringify(data.toString())};`,
        map: { mappings: '' }
      };
    }
  };
}