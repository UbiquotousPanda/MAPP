// Constitution F6: values come from the tokens in src/ui/tokens.css, generic styles from ui/.
const TOKEN = '/^((var\\(--[\\w-]+\\)|0|inherit|none|50%)\\s*)+$/';
// A ring, rule or selection bar draws its own geometry; its colour is still a token.
const SHADOW = '/^(inset|-?\\d+px|0|none|var\\(--[\\w-]+\\)|,|\\s)+$/';
const SPACING_PX = '/(^|[\\s(,-])([3-9]|\\d{2,}|\\d*\\.\\d+)px/';

export default {
  ignoreFiles: ['src/ui/tokens.css', 'dist/**', 'coverage/**'],
  rules: {
    'color-no-hex': true,
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    'declaration-property-value-allowed-list': {
      'font-weight': [TOKEN],
      'font-size': [TOKEN],
      'border-radius': [TOKEN],
      'box-shadow': [SHADOW],
    },
    'declaration-property-value-disallowed-list': {
      '/^(margin|padding|gap|row-gap|column-gap)/': [SPACING_PX],
    },
  },
  overrides: [
    {
      files: ['src/features/**/*.css', 'src/app/**/*.css'],
      rules: {
        'selector-disallowed-list': [
          ['/:global\\(/', '/thead\\s+th/', '/tfoot/'],
          { message: 'Dark-mode overrides and table base styles belong in ui/ (F6).' },
        ],
      },
    },
  ],
};
