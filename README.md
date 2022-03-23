# nice-index

NOTE: This extension is being unpublished due to the need to frequently update it when VSCode changes its interface. Feel free to fork if you're willing to maintain it!

## Features missing:

- Only supports tabs in the tab bar - not in the "Open Editors" section in the Explorer
- Doesn't update the title-bar

## Building / publishing

To publish, you need `vsce`

```
npm install -g vsce
```

Now just run

```
vsce package
vsce publish
```
