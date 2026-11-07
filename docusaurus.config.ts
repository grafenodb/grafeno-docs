import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Grafeno',
  tagline: 'A graph engine for agent memory and knowledge',
  favicon: 'img/grafeno-mark.svg',

  // Served at grafenodb.org/docs/ (the site's landing page is grafenodb.org).
  url: 'https://grafenodb.org',
  baseUrl: '/docs/',

  organizationName: 'grafenodb',
  projectName: 'grafeno',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    localeConfigs: {
      en: {
        label: 'English',
        htmlLang: 'en',
      },
      es: {
        label: 'Español',
        htmlLang: 'es',
      },
    },
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/grafeno-banner.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Grafeno',
      logo: {
        alt: 'Three rings from a graphene lattice',
        src: 'img/grafeno-mark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/grafenodb/grafeno',
          label: 'Engine',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Introduction',
              to: '/',
            },
            {
              label: 'Install Grafeno',
              to: '/get-started/install',
            },
            {
              label: 'Your first graph',
              to: '/get-started/first-graph',
            },
            {
              label: 'Run scripts',
              to: '/guides/scripts',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Engine on GitHub',
              href: 'https://github.com/grafenodb/grafeno',
            },
            {
              label: 'Grafeno Studio on GitHub',
              href: 'https://github.com/grafenodb/grafeno-studio',
            },
          ],
        },
      ],
      copyright: 'Grafeno.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
