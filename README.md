# postcss-global-nested

[PostCSS] plugin to better support [Svelte]'s [:global] in [nesting] [context]

[PostCSS]: https://github.com/postcss/postcss
[Svelte]: https://svelte.dev
[:global]: https://svelte.dev/docs#component-format-style
[nesting]: https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting

```css
button {
    & > :global-nested(.foo) {
        &:focus {
            outline: #f66 dashed;
        }
    }
}
```

```css
button > :global(.foo:focus) {
    outline: #f66 dashed;
}
```

### Limitations

When `:global-nested` is the first selector, it is just replaced by `:global` without wrapping the nested selectors. A warning will be shown.

## Usage

**Step 1:** Install plugin:

```sh
npm install --save-dev @oat-sa/postcss-global-nested
```

**Step 2:** Configure it

For example with [postcss-preset-env](https://github.com/csstools/postcss-plugins/tree/main/plugin-packs/postcss-preset-env):

```diff
module.exports = {
  plugins: [
    require('postcss-preset-env')({
        stage: 1,
        features: {
            'nesting-rules': {
                noIsPseudoSelector: true
            }
        },
        insertAfter: {
            'nesting-rules': require('postcss-global-nested')
        }
    })
    require('autoprefixer')
  ]
}
```

### Options

-   `globalNestedPseudo` : the pattern to search for, `:global-nested` by default
-   `globalPseudo` : the replacement pseudo for the wrapper, `:global` by default

## License

Copyright (c) 2022 Open Assessment Technologies SA

Licensed under the terms of the [GNU GPL v2](./LICENSE)
