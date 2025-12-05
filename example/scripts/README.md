# Version Management System

This directory contains a flexible version management system for testing different React Native and Expo version combinations.

## Quick Start

```bash
# Show all available configurations
yarn switch-versions

# Switch to specific configurations
yarn use:rn-0.76      # React Native 0.76 + Expo 52
yarn use:next         # Latest canary versions
yarn use:latest       # Latest stable versions

# Or use the direct command
yarn switch-versions rn-0.76
```

## How It Works

### Configuration File (`version-configs.json`)
This file defines version sets with three main sections:

1. **configurations**: Named version sets with dependencies and devDependencies
2. **managedPackages**: Packages that get removed/reinstalled when switching
3. **preservedPackages**: Packages that remain unchanged (your core dependencies)

### Script (`scripts/switch-versions.js`)
The Node.js script handles:
- Reading configuration from `version-configs.json`
- Removing managed packages
- Installing the correct versions for the target configuration
- Providing helpful output and error handling

## Adding New Configurations

To add a new version set, edit `version-configs.json`:

```json
{
  "configurations": {
    "your-new-config": {
      "description": "Description of this configuration",
      "dependencies": {
        "expo": "~50.0.0",
        "react-native": "~0.74.0"
      },
      "devDependencies": {
        "@types/react": "~18.0.0"
      }
    }
  }
}
```

Then add a convenience script to `package.json`:
```json
{
  "scripts": {
    "use:your-config": "node scripts/switch-versions.js your-new-config"
  }
}
```

## Benefits Over Previous System

- ✅ **Maintainable**: Version information centralized in JSON config
- ✅ **Extensible**: Easy to add new version sets
- ✅ **Readable**: Clear structure and helpful output
- ✅ **Safe**: Preserves important packages, handles errors gracefully
- ✅ **Flexible**: Can manage any number of package combinations
- ✅ **Documented**: Self-documenting with descriptions and usage help

## After Switching Versions

After switching to a new configuration, you may need to:

```bash
# Clean and rebuild native platforms
yarn clean:ios && yarn ios
yarn clean:android && yarn android

# Verify compatibility
yarn check-expo
```