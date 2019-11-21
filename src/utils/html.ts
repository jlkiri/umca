import isComponent from './isComponent';

type HTMLString = string;

export interface ARTNode {
  id?: string;
  htmlString: HTMLString;
  tag: Tag;
  attrs: Attrs | NativeAttrs | null;
  children: ARTNode[];
  meta: { localLinks: LocalLinks };
}

type Tag = string | Component;
type Attrs = Record<string, string | number> & { to: Component; name: string };
export type NativeAttrs = Omit<Attrs, 'to' | 'name'>;
type Children = ARTNode[];

type BuildHtml = (
  tag: Tag,
  attrs: Attrs | null,
  ...children: Children
) => ARTNode;

type MemoizedComponentsMap = Map<Component, ARTNode>;

export type Component = (attrs: Attrs | null) => ARTNode;

type LocalLinks = Array<{ name: string; htmlString: HTMLString }>;
type GlobalLinks = {
  [componentName: string]: {
    localLinks: ARTNode['meta']['localLinks'];
    htmlString: HTMLString;
  };
};

export interface HtmlBuilderOutput {
  renderToHTMLString: BuildHtml;
  globalLinks: GlobalLinks;
}

export type CreateHtmlBuilder = () => HtmlBuilderOutput;

const createHtmlBuilder: CreateHtmlBuilder = function createHtmlBuilder() {
  const memoizedComponents: MemoizedComponentsMap = new Map();
  const globalLinks: GlobalLinks = {};

  const html: BuildHtml = function html(tag, attrs, ...children) {
    const localLinks: LocalLinks = [];

    if (isComponent(tag)) {
      const memoizedResult = memoizedComponents.get(tag);

      if (memoizedResult) return memoizedResult;

      const renderResult = tag(attrs);

      globalLinks[tag.name] = {
        htmlString: renderResult.htmlString,
        localLinks: renderResult.meta.localLinks,
      };

      const memoTag: Component = attrs => tag(attrs);
      memoizedComponents.set(memoTag, renderResult);

      return renderResult;
    }

    let [otag, ctag] = [`<${tag}`, `</${tag}>`];

    const childrenHtml = children.map(child => child.htmlString || child);

    if (attrs) {
      Object.entries(attrs).forEach(([attr, value]) => {
        if (attr !== 'to') {
          otag += ` ${attr}="${value}"`;
        }
      });

      if (tag === 'a' && isComponent(attrs.to)) {
        otag += ` href="${attrs.to.name}.html"`;
        const { htmlString } = html(attrs.to, null);
        localLinks.push({ name: attrs.to.name, htmlString });
      }
    }

    otag += `>`;

    return {
      htmlString: `${otag}${childrenHtml.join('')}${ctag}`,
      tag: tag,
      attrs: attrs,
      children: children,
      meta: {
        localLinks,
      },
    };
  };

  return {
    renderToHTMLString: html,
    globalLinks: globalLinks,
  };
};

export default createHtmlBuilder;
