// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

const publisher = 'skoshy';
const scriptName = 'nice-index';

interface FolderMap {
  [key: string]: string;
}

interface Contribution {
  folderMap: FolderMap;
  browserModules: Array<string>;
  mainProcessModules: Array<string>;
}

interface API {
  contribute(sourceExtensionId: string, contribution: Contribution): void;
  active(): boolean;
}

function mkdirRecursive(p: string) {
  if (!fs.existsSync(p)) {
    if (path.parse(p).root !== p) {
      const parent = path.join(p, '..');
      mkdirRecursive(parent);
    }
    fs.mkdirSync(p);
  }
}

class Extension {
  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(`${scriptName}.`)) {
          this.configurationChanged(e);
        }
      })
    );
  }

  get sourcePath() {
    return path.join(this.context.extensionPath, 'out', 'modules');
  }

  get modulesPath() {
    return path.join(this.context.globalStoragePath, 'modules');
  }

  private copyModule(name: string) {
    const src = path.join(this.sourcePath, name);
    const dst = path.join(this.modulesPath, name);

    const data = fs.readFileSync(src);

    // if the file exists and hasn't changed, exit
    if (fs.existsSync(dst) && fs.readFileSync(dst).compare(data) === 0) {
      return false;
    }

    // else copy the module
    fs.writeFileSync(dst, data);
    return true;
  }

  private get haveStylesheetCustomizations() {
    return (
      vscode.workspace.getConfiguration().get(`${scriptName}.stylesheet`) !==
      undefined
    );
  }

  async start() {
    const freshStart = !fs.existsSync(this.modulesPath);
    mkdirRecursive(this.modulesPath);

    // copy the modules to global storage path, which unlike extension path is not versioned
    // and will work after update

    const browser = [
      this.copyModule('nice-index.css'),
      this.copyModule('nice-index.js'),
      this.copyModule('tabs.js'),
    ];

    const mainProcess = [
      this.copyModule('main.js'),
      this.copyModule('utils.js'),
    ];

    const updatedBrowser = browser.includes(true);
    const updatedMainProcess = mainProcess.includes(true);

    if (!freshStart && this.haveStylesheetCustomizations) {
      if (updatedMainProcess) {
        const res = await vscode.window.showInformationMessage(
          `${scriptName} extension was updated. Your VSCode instance needs to be restarted`,
          'Restart'
        );
        if (res === 'Restart') {
          this.promptRestart();
        }
      } else if (updatedBrowser) {
        const res = await vscode.window.showInformationMessage(
          `${scriptName} extension was updated. Your VSCode window needs to be reloaded.`,
          'Reload Window'
        );
        if (res === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    }

    const monkeyPatch = vscode.extensions.getExtension('iocave.monkey-patch');

    if (monkeyPatch !== undefined) {
      await monkeyPatch.activate();
      const exports: API = monkeyPatch.exports;
      exports.contribute(`${publisher}.${scriptName}`, {
        folderMap: {
          'nice-index': this.modulesPath,
        },
        browserModules: ['nice-index/nice-index'],
        mainProcessModules: ['nice-index/main'],
      });
    } else {
      vscode.window.showWarningMessage(
        `Monkey Patch extension is not installed. ${scriptName} will not work.`
      );
    }
  }

  private async promptRestart() {
    // This is a hacky way to display the restart prompt
    const v = vscode.workspace
      .getConfiguration()
      .inspect('window.titleBarStyle');
    if (v !== undefined) {
      const value = vscode.workspace
        .getConfiguration()
        .get('window.titleBarStyle');
      await vscode.workspace
        .getConfiguration()
        .update(
          'window.titleBarStyle',
          value === 'native' ? 'custom' : 'native',
          vscode.ConfigurationTarget.Global
        );
      vscode.workspace
        .getConfiguration()
        .update(
          'window.titleBarStyle',
          v.globalValue,
          vscode.ConfigurationTarget.Global
        );
    }
  }

  async configurationChanged(e: vscode.ConfigurationChangeEvent) {
    const monkeyPatch = vscode.extensions.getExtension('iocave.monkey-patch');
    if (monkeyPatch !== undefined) {
      await monkeyPatch.activate();
      const exports: API = monkeyPatch.exports;
      if (!exports.active()) {
        const res = await vscode.window.showWarningMessage(
          `Monkey Patch extension is not enabled. Please enable Monkey Patch in order to use ${scriptName}.`,
          'Enable'
        );
        if (res === 'Enable') {
          vscode.commands.executeCommand('iocave.monkey-patch.enable');
        }
      } else {
        const res = await vscode.window.showInformationMessage(
          `${scriptName} requires window reload`,
          'Reload Window'
        );
        if (res === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    }
  }

  context: vscode.ExtensionContext;
}

export function activate(context: vscode.ExtensionContext) {
  new Extension(context).start();
}

// this method is called when your extension is deactivated
export function deactivate() {}
