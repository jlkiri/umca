import isComponent from './isComponent';

type HTMLString = string;

export interface ARTNode {
  id?: string;
  htmlString: HTMLString;
  tag: Tag;
  attrs: Attrs | NativeAttrs | null;
  children: ARTNode[];
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

export type Component = (attrs: Attrs | null) => ARTNode;

export interface HtmlBuilderOuput {
  renderToHTMLString: BuildHtml;
  links: { [link: string]: HTMLString };
}

export type CreateHtmlBuilder = () => HtmlBuilderOuput;

const createHtmlBuilder: CreateHtmlBuilder = function createHtmlBuilder() {
  const links: HtmlBuilderOuput['links'] = {};

  const html: BuildHtml = function html(tag, attrs, ...children) {
    if (isComponent(tag)) return tag(attrs);

    let [otag, ctag] = [`<${tag}`, `</${tag}>`];

    const childrenHtml = children.map(child => child.htmlString || child);

    if (attrs) {
      Object.entries(attrs).forEach(([attr, value]) => {
        if (attr !== 'to') {
          otag += ` ${attr}="${value}"`;
        }
      });

      if (tag === 'a' && typeof attrs.to === 'function') {
        otag += ` href="${attrs.name}.html"`;
        const { htmlString } = html(attrs.to, null);
        links[attrs.name] = htmlString;
      }
    }

    otag += `>`;

    return {
      htmlString: `${otag}${childrenHtml.join('')}${ctag}`,
      tag: tag,
      attrs: attrs,
      children: children,
    };
  };

  return {
    renderToHTMLString: html,
    links: links,
  };
};

export default createHtmlBuilder;
