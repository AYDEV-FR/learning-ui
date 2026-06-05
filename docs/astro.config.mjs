import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// Deployed to GitHub Pages project site: https://aydev-fr.github.io/learning-ui/
export default defineConfig({
  site: 'https://aydev-fr.github.io',
  base: '/learning-ui',
  integrations: [
    starlight({
      title: 'Learning UI',
      description:
        'Interactive learning environments with step-by-step instructions and a web terminal.',
      social: {
        github: 'https://github.com/AYDEV-FR/learning-ui',
      },
      editLink: {
        baseUrl: 'https://github.com/AYDEV-FR/learning-ui/edit/main/docs/',
      },
      sidebar: [
        { label: 'Introduction', slug: 'intro' },
        { label: 'Writing Scenarios', slug: 'scenarios' },
        {
          label: 'Features',
          items: [
            { label: 'Terminal', slug: 'features/terminal' },
            { label: 'Kubernetes', slug: 'features/kubernetes' },
            { label: 'VS Code Editor', slug: 'features/editor' },
            { label: 'Custom Tabs', slug: 'features/custom-tabs' },
          ],
        },
        {
          label: 'Advanced',
          items: [
            { label: 'Complex Scenarios', slug: 'advanced/complex-scenarios' },
            { label: 'Custom Shell', slug: 'advanced/custom-shell' },
          ],
        },
      ],
    }),
  ],
})
