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
    // Learning GQ one feature at a time: each page explains it, shows the
    // statement and what the engine answers.
    {
      type: 'category',
      label: 'GQ tutorial',
      link: {type: 'doc', id: 'gq/index'},
      items: [
        {
          type: 'category',
          label: 'Basics',
          collapsed: false,
          items: [
            'gq/create',
            'gq/match',
            'gq/where',
            'gq/return',
            'gq/aggregation',
            'gq/with',
          ],
        },
        {
          type: 'category',
          label: 'Changing data',
          items: ['gq/set-remove', 'gq/merge', 'gq/delete', 'gq/unwind-foreach'],
        },
        {
          type: 'category',
          label: 'Combining queries',
          items: ['gq/union-subqueries', 'gq/paths'],
        },
        {
          type: 'category',
          label: 'Values and functions',
          items: [
            'gq/strings',
            'gq/numbers',
            'gq/lists-maps',
            'gq/conditions',
            'gq/dates',
            'gq/time-travel',
          ],
        },
        {
          type: 'category',
          label: 'Search',
          items: ['gq/full-text', 'gq/similar-text'],
        },
        {
          type: 'category',
          label: 'Schema and operation',
          items: [
            'gq/indexes',
            'gq/constraints',
            'gq/procedures',
            'gq/transactions',
            'gq/namespaces',
            'gq/events',
            'gq/explain-profile-trace',
            'gq/parameters',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Vectors',
      link: {type: 'doc', id: 'vectors/index'},
      items: ['vectors/vector-indexes', 'vectors/hybrid-search', 'vectors/sizing'],
    },
    {
      type: 'category',
      label: 'Graph algorithms',
      link: {type: 'doc', id: 'algorithms/index'},
      items: [
        'algorithms/paths',
        'algorithms/centrality',
        'algorithms/communities',
        'algorithms/similarity',
        'algorithms/structure',
        'algorithms/flows',
        'algorithms/walks-embeddings',
        'algorithms/simulation',
      ],
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
