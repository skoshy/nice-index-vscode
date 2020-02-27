// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const publisher = "skoshy";
const scriptName = "nice-index";

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
      let parent = path.join(p, "..");
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
    return path.join(this.context.extensionPath, "modules");
  }

  get modulesPath() {
    return path.join(this.context.globalStoragePath, "modules");
  }

  private copyModule(name: string) {
    let src = path.join(this.sourcePath, name);
    let dst = path.join(this.modulesPath, name);

    let data = fs.readFileSync(src);

    if (fs.existsSync(dst)) {
      let current = fs.readFileSync(dst);
      if (current.compare(data) === 0) {
        return false;
      }
    }
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
    let freshStart = !fs.existsSync(this.modulesPath);
    mkdirRecursive(this.modulesPath);

    // copy the modules to global storage path, which unlike extension path is not versioned
    // and will work after update

    let browser = [
      this.copyModule("nice-index.css"),
      this.copyModule("nice-index.js"),
      this.copyModule("tabs.js")
    ];

    let mainProcess = [this.copyModule("main.js"), this.copyModule("utils.js")];

    let updatedBrowser = browser.includes(true);
    let updatedMainProcess = mainProcess.includes(true);

    if (!freshStart && this.haveStylesheetCustomizations) {
      if (updatedMainProcess) {
        let res = await vscode.window.showInformationMessage(
          `${scriptName} extension was updated. Your VSCode instance needs to be restarted`,
          "Restart"
        );
        if (res === "Restart") {
          this.promptRestart();
        }
      } else if (updatedBrowser) {
        let res = await vscode.window.showInformationMessage(
          `${scriptName} extension was updated. Your VSCode window needs to be reloaded.`,
          "Reload Window"
        );
        if (res === "Reload Window") {
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      }
    }

    let monkeyPatch = vscode.extensions.getExtension("iocave.monkey-patch");

    if (monkeyPatch !== undefined) {
      await monkeyPatch.activate();
      let exports: API = monkeyPatch.exports;
      exports.contribute(`${publisher}.${scriptName}`, {
        folderMap: {
          "nice-index": this.modulesPath
        },
        browserModules: ["nice-index/nice-index"],
        mainProcessModules: ["nice-index/main"]
      });
    } else {
      vscode.window.showWarningMessage(
        `Monkey Patch extension is not installed. ${scriptName} will not work.`
      );
    }
  }

  private async promptRestart() {
    // This is a hacky way to display the restart prompt
    let v = vscode.workspace.getConfiguration().inspect("window.titleBarStyle");
    if (v !== undefined) {
      let value = vscode.workspace
        .getConfiguration()
        .get("window.titleBarStyle");
      await vscode.workspace
        .getConfiguration()
        .update(
          "window.titleBarStyle",
          value === "native" ? "custom" : "native",
          vscode.ConfigurationTarget.Global
        );
      vscode.workspace
        .getConfiguration()
        .update(
          "window.titleBarStyle",
          v.globalValue,
          vscode.ConfigurationTarget.Global
        );
    }
  }

  async configurationChanged(e: vscode.ConfigurationChangeEvent) {
    let monkeyPatch = vscode.extensions.getExtension("iocave.monkey-patch");
    if (monkeyPatch !== undefined) {
      await monkeyPatch.activate();
      let exports: API = monkeyPatch.exports;
      if (!exports.active()) {
        let res = await vscode.window.showWarningMessage(
          `Monkey Patch extension is not enabled. Please enable Monkey Patch in order to use ${scriptName}.`,
          "Enable"
        );
        if (res === "Enable") {
          vscode.commands.executeCommand("iocave.monkey-patch.enable");
        }
      } else {
        let res = await vscode.window.showInformationMessage(
          `${scriptName} requires window reload`,
          "Reload Window"
        );
        if (res === "Reload Window") {
          vscode.commands.executeCommand("workbench.action.reloadWindow");
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
