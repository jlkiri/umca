## Awave

<div align="center"><img src="assets/awave.png" alt="awavelogo"/></div>

<div align="center">A simple zero-runtime serve-side rendering framework</div>

### Get started

The best way to begin developing with Awave is with `npx`:

```
npx awave create yourprojectname
cd yourprojectname
```

### What Awave does and doesn't do

:white_check_mark: Takes JSX files that you wrote and compiles them into plain HTML  
:white_check_mark: Automatically creates pages for (and only for) JSX files that are linked to with an `<a>` tag  
:white_check_mark: Automatically adds prefetch hints to `<head>` if a page has internal links  
:white_check_mark: Allows to import Markdown files from JSX files and automatically converts them to HTML  
:white_check_mark: Comes with Tailwind CSS  
:white_check_mark: Ships zero Javascript to the client

:x: Does not handle any user interactions. You have to bring your own JS  
:x: Not an SPA (at least not yet)

### Developing with Awave

1. Run `yarn build` or `npm build` to (re)compile your JSX
2. Run `yarn start` or `npm start` to locally host the `public` folder

**`/src`**

This is where all of your JSX files should be. Note that at least one of them must be named `index.jsx`, which is an entry file.

**`/pages`**

Awave allows you to import `.md` files right in your components. Put `.md` files in this folder.

### CSS

Awave is equipped with Tailwind CSS. This means you only need to add existing (utility) classes to your elements and no CSS files are needed. This makes the framework highly opinionated. However, since pages are build with (reusable) components in Awave, you can both keep your design atomic AND avoid scope problems because all classes are just utilities.
