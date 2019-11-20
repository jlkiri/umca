import rollup from 'rollup';

export default function injectHtml(requirePath: string): rollup.Plugin {
  return {
    name: 'rollup-plugin-inject-html',
    renderChunk(code, chunk) {
      if (chunk.facadeModuleId && /.*\.jsx/.test(chunk.facadeModuleId)) {
        const injection = `const { htmlBuilder } = require("${requirePath}")\n`;
        return { code: `${injection}${code}`, map: '' };
      }

      return null;
    },
  };
}
