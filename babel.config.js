module.exports = {
  presets: [
    [
      // Using polyfills: No polyfills were added, since the `useBuiltIns` option was not set.
      '@babel/preset-env',
      {
        targets: {
          // Keep this roughly in-line with our "engines.node" value in package.json
          node: '8'
        }
      }
    ],
  ],
  plugins: [
  ]
}
