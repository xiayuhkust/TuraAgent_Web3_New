# TuraAgent Web3 Frontend

A React-based frontend for the TuraAgent Web3 platform, built with TypeScript and Vite.

## Environment Setup

Required environment variables in `.env`:
```
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_RPC_URL=your_rpc_url
VITE_CHAIN_ID=your_chain_id
VITE_CHAIN_NAME=your_chain_name
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Application Structure

The application consists of four main tabs:

1. **Chat**: Chat interface with workflow list and agent dialogue
2. **Wallet**: MetaMask-style interface for web3 functionality
3. **Workflow**: Visual workflow editor (coming soon)
4. **Agents**: Contract deployment and management interface

## Deployment

1. Set up environment variables in `.env`
2. Build the project: `pnpm build`
3. Deploy the `dist` directory
4. Verify deployment by checking all UI elements and functionality

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
