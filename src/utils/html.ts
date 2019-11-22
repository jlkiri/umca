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
type ComponentsLinkedTo = string[];
type GlobalLinks = {
  [componentName: string]: {
    localLinks: ARTNode['meta']['localLinks'];
    htmlString: HTMLString;
    isLinkedTo: boolean;
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
  const componentsLinkedTo: ComponentsLinkedTo = [];

  const html: BuildHtml = function html(tag, attrs, ...children) {
    const localLinks: LocalLinks = [];

    const childLocalLinks = (children as Array<ARTNode | string>)
      .map(child => {
        if (typeof child === 'string') return [];
        return child.meta.localLinks;
      })
      .reduce((a, b) => a.concat(b), []);

    if (isComponent(tag)) {
      //const memoizedResult = memoizedComponents.get(tag);

      // if (memoizedResult) return memoizedResult;

      const renderResult = tag(attrs);

      const aggregateLinks = [...renderResult.meta.localLinks];
      const lowerCaseTag = tag.name.toLowerCase();

      globalLinks[lowerCaseTag] = {
        isLinkedTo: componentsLinkedTo.includes(lowerCaseTag),
        htmlString: renderResult.htmlString,
        localLinks: aggregateLinks,
      };

      const memoTag: Component = attrs => tag(attrs);
      memoizedComponents.set(memoTag, renderResult);

      return renderResult;
    }

    let [otag, ctag] = [`<${tag}`, `</${tag}>`];

    const childrenHtml = (children as Array<ARTNode | string>).map(child =>
      typeof child === 'string' ? child : child.htmlString
    );

    if (attrs) {
      Object.entries(attrs).forEach(([attr, value]) => {
        if (attr !== 'to') {
          otag += ` ${attr}="${value}"`;
        }
      });

      if (tag === 'a' && attrs.to) {
        otag += ` href="${attrs.to}.html"`;

        if (attrs.to in globalLinks) {
          globalLinks[attrs.to].isLinkedTo = true;
        }

        componentsLinkedTo.push(attrs.to);
        localLinks.push(attrs.to);
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
