function createModuleKeeper() {
  const modules = { entryFileName: '' };

  function saveEntryFileName(name: string) {
    modules.entryFileName = name;
  }

  function isEntry(name: string) {
    return modules.entryFileName === name;
  }

  return {
    saveEntryFileName,
    isEntry,
  };
}

export default createModuleKeeper;
