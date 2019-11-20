function createModuleKeeper() {
  const modules = { entryFileName: '', templateHTML: '' };

  function saveEntryFileName(name: string) {
    modules.entryFileName = name;
  }

  function isEntry(name: string) {
    return modules.entryFileName === name;
  }

  function saveTemplateHTML(html: string) {
    modules.templateHTML = html;
  }

  function getTemplateHTML() {
    return modules.templateHTML;
  }

  return {
    saveEntryFileName,
    saveTemplateHTML,
    getTemplateHTML,
    isEntry,
  };
}

export default createModuleKeeper;
