class CSSExtractor {
  static extract(content: string) {
    return content.match(/[\w-/:]+(?<!:)/g) || [];
  }
}

export default CSSExtractor;
