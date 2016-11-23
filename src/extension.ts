'use strict';

import * as path from 'path';

import * as child_process from 'child_process';

import { workspace, Disposable, ExtensionContext, languages, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, ErrorAction, CloseAction } from 'vscode-languageclient';
import { Message } from 'vscode-jsonrpc';

let DEV_MODE = false;

export function activate(context: ExtensionContext) {
    console.log('GCL Extension Started');
	let serverOptions: ServerOptions;
	let lc: LanguageClient;

	if (DEV_MODE) {
		serverOptions = {
			run: {command: "gcls"},
			debug: {command: "gcls"}
		};
	} else {
		serverOptions = () => new Promise<child_process.ChildProcess>((resolve, reject) => {
			function spawnServer(...args: string[]): child_process.ChildProcess {
				let childProcess = child_process.spawn("gcls");
				childProcess.stderr.on('data', data => {
					lc.warn('Error in language server', data);
					//console.log(data.toString());
				});
				childProcess.on('error', err => {
					lc.warn(err.message);
					lc.warn('Error running "gcls" command. Code insight is not available.');
					lc.warn('Please run "pip install gcl-language-server" or check your PATH.')
				});
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
	lc = new LanguageClient('GCL Language Service', serverOptions, clientOptions);

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

