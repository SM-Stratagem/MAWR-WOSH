const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

config.watchFolders = [workspaceRoot];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === '../../convex/_generated/api' || 
        moduleName === '../../../convex/_generated/api' ||
        moduleName === '../../../../convex/_generated/api') {
      return {
        filePath: path.join(__dirname, 'convex/_generated/api.js'),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;