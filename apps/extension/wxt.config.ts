import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  dev: {
    server: {
      // Next.js uses 3000. WXT would otherwise bind localhost:3000 and hide the web app.
      port: 3001,
    },
  },
  manifest: {
    name: 'Job Application Autofill',
    description: 'Fill employer application forms from your profile. Never submits.',
    permissions: ['storage', 'tabs', 'activeTab', 'scripting'],
    host_permissions: [
      'http://localhost:3000/*',
      'http://127.0.0.1:3000/*',
      'https://job-application-tracker-umber-two.vercel.app/*',
    ],
    commands: {
      autofill: {
        description: 'Autofill the application on this page',
        suggested_key: {
          default: 'Alt+Shift+F',
        },
      },
    },
  },
});
