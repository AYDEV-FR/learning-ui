/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    'scenarios',
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/terminal',
        'features/kubernetes',
        'features/editor',
        'features/custom-tabs',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/complex-scenarios',
        'advanced/custom-shell',
      ],
    },
  ],
};

export default sidebars;
