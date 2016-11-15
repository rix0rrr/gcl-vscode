'use strict';

import * as path from 'path';

import * as child_process from 'child_process';

import { workspace, Disposable, ExtensionContext, languages, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

let DEV_MODE = false;

export function activate(context: ExtensionContext) {
    console.log('GCL Server Started');
	let serverOptions: ServerOptions;

	if (DEV_MODE) {
		serverOptions = {
			run: {command: "gcls"},
			debug: {command: "gcls"}
		};
	} else {
		serverOptions = () => new Promise<child_process.ChildProcess>((resolve, reject) => {
			function spawnServer(...args: string[]): child_process.ChildProcess {
				let childProcess = child_process.spawn("gcls");
				childProcess.stderr.on('data', data => { console.log(data.toString()); });
				return childProcess; // Uses stdin/stdout for communication
			}

			resolve(spawnServer())
		});
	}

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for Rust files
		documentSelector: ['gcl'],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: 'gclLanguage',
			// Notify the server about changes to files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/*.*')
		}
	}

	// Create the language client and start the client.
	let lc = new LanguageClient('GCL Language Service', serverOptions, clientOptions);

	lc.onNotification({method: "gclDocument/diagnosticsBegin"}, function(f) {
		window.setStatusBarMessage("GCL analysis: started");
	})
	lc.onNotification({method: "gclDocument/diagnosticsEnd"}, function(f) {
		window.setStatusBarMessage("GCL analysis: done");
	})
	let disposable = lc.start();

	// Push the disposable to the context's subscriptions so that the
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable);
}

