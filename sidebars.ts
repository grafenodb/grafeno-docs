import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// The order a newcomer reads in: install, a first graph, the Studio, then
// the ideas, the guides, and what to look up.
const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Get started',
      collapsed: false,
      items: ['get-started/install', 'get-started/first-graph', 'get-started/studio'],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: ['concepts/data-model', 'concepts/time', 'concepts/search-and-recall'],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/scripts',
        'guides/agent-memory',
        'guides/access',
        'guides/http-api',
        'guides/mcp',
      ],
    },
    {type: 'category', label: 'Clients', items: ['clients/typescript']},
    {
      type: 'category',
      label: 'Operations',
      items: ['operations/cli', 'operations/instances', 'operations/backups', 'operations/cluster'],
    },
    {type: 'category', label: 'Reference', items: ['reference/gq', 'reference/configuration']},
  ],
};

export default sidebars;
