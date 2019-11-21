import isComponent from './isComponent';

type HTMLString = string;

export interface ARTNode {
  id?: string;
  htmlString: HTMLString;
  tag: Tag;
  attrs: Attrs | NativeAttrs | null;
  children: ARTNode[] | string[];
  meta: { localLinks: LocalLinks };
}

type Tag = string | Component;
type Attrs = Record<string, string | number> & { to: string; name: string };
export type NativeAttrs = Omit<Attrs, 'to' | 'name'>;
type Children = ARTNode[] | string[];

type BuildHtml = (
  tag: Tag,
  attrs: Attrs | null,
  ...children: Children
) => ARTNode;

type MemoizedComponentsMap = Map<Component, ARTNode>;

export type Component = (attrs: Attrs | null) => ARTNode;

type LocalLinks = Array<string>;
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

    const childLocalLinks = (children as Array<ARTNode | string>).map(child => {
      console.log(child);
      if (typeof child === "string") return [];
      console.log(child.meta.localLinks)
      return child.meta.localLinks;
    }).reduce((a, b) => a.concat(b), [])

    if (isComponent(tag)) {
      //const memoizedResult = memoizedComponents.get(tag);

      // if (memoizedResult) return memoizedResult;

      const renderResult = tag(attrs);

      const aggregateLinks = [...renderResult.meta.localLinks]

      globalLinks[tag.name] = {
        htmlString: renderResult.htmlString,
        localLinks: aggregateLinks
      };

      const memoTag: Component = attrs => tag(attrs);
      memoizedComponents.set(memoTag, renderResult);

      return renderResult;
    }

    let [otag, ctag] = [`<${tag}`, `</${tag}>`];

    const childrenHtml = (children as Array<ARTNode | string>).map(child => typeof child === "string" ? child : child.htmlString);

    if (attrs) {
      Object.entries(attrs).forEach(([attr, value]) => {
        if (attr !== 'to') {
          otag += ` ${attr}="${value}"`;
        }
      });

      if (tag === 'a' && attrs.to) {
        otag += ` href="${attrs.to}.html"`;
        //const memoizedResult = memoizedComponents.get(attrs.to);
        // const { htmlString } = html(attrs.to, null);
        localLinks.push(attrs.to);
        console.log(localLinks)
      }
    }

    otag += `>`;

    return {
      htmlString: `${otag}${childrenHtml.join('')}${ctag}`,
      tag: tag,
      attrs: attrs,
      children: children,
      meta: {
        localLinks: [...localLinks, ...childLocalLinks],
      },
    };
  };

  return {
    renderToHTMLString: html,
    globalLinks: globalLinks,
  };
};

export default createHtmlBuilder;
