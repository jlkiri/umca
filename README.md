## Awave

<div align="center"><img src="assets/awave.png" alt="awavelogo"/></div>

<div align="center">A simple zero-runtime serve-side rendering framework</div>

### Get started

The best way to begin developing with Awave is with `npx`.

```
npx awave create yourprojectname
cd yourprojectname
```

### What it does and doesn't do

:white_check_mark: Awave takes JSX files that you wrote and compiles them into plain HTML
:white_check_mark: Awave automatically creates pages for (and only for) JSX files that are linked to with an `<a>` tag
:white_check_mark: Awave automatically adds prefetch hints to `<head>` if a page has internal links
:white_check_mark: Awave is shipped with Tailwind CSS, so you only have to add classes
:white_check_mark: Awave ships zero Javascript to the client

:x: Awave does not handle any user interactions. You have to provide your own JS
:x: Awave is not an SPA (at least not yet)

### Developing with Awave

1. Run `yarn build` or `npm build` to compile your JSX.
2. Run `yarn start` or `npm start` to locally host the `public` folder.
