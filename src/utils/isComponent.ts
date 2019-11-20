import { Component } from './html';

const isComponent = (tag: string | Component): tag is Component =>
  typeof tag === 'function';

export default isComponent;
