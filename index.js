
var chalk_global = require('chalk');

function strmul(s, n) {
	var r = '';
	for (var i = 0; i < n; ++i) {
		r += s;
	}
	return r;
}

var TraackrReporter = function(baseReporterDecorator, formatError, helper, config) {
	baseReporterDecorator(this);

	// Configuration
	config.traackrReporter = config.traackrReporter || {};

	var show = 'all';
	var specLength = config.traackrReporter.specLength || 75;

  this.failures = [];
  this.successes = [];
	this.skipped = [];

	// We use our own instance, respecting config.color
	var chalk = new chalk_global.constructor({enabled: config.colors});

	var specorder, specresults;

  this.logFinalErrors = function (errors) {
    this.writeCommonMsg('\n');
    this.WHITESPACE = '     ';

    errors.forEach(function (failure, index) {
      index = index + 1;

      if (index > 1) {
        this.writeCommonMsg('\n');
      }

      this.writeCommonMsg((index + ') ' + failure.description + '\n').red);
      this.writeCommonMsg((this.WHITESPACE + failure.suite.join(' ') + '\n').red);
      failure.log.forEach(function (log) {
	      this.writeCommonMsg(this.WHITESPACE + formatError(log)
	        .replace('/var/folders/1d/', '')
	        .replace(/(?:_?).*?\//, '')
	        .replace('T/', '')
	        .replace(/\<.*/, '')
	        .replace('"]', '')
	        .replace(/\\n/g, '\n').grey);
	     }, this);
    }, this);

    this.writeCommonMsg('\n');
  };

	this.specSuccess = this.specFailure = this.specSkipped = function(browser, result) {
		if (!result.suite) {
			return;
		}

		if (result.skipped || result.pending) {
			this.skipped.push(result);
		} else if (result.success) {
			this.successes.push(result);
		} else {
			this.failures.push(result);
		}

		var specid = result.suite.join('/') + '/' + result.description;
		if (!(specid in specresults)) {
			specorder.push(specid);
			specresults[specid] = {
				spec: result.suite.slice().concat(result.description),
				results: Object.create(null)
			};
		}
		specresults[specid].results[browser.id] = result;
	}

	// Previously printed spec path
	var currentPath;
	this.printSpecLabel = function(path) {
		var indent = "  ";
		path.forEach(function(s, i) {
			// We keep the current comon prefix and start to print
			// the new information on the first difference.
			if (i < currentPath.length && s != currentPath[i]) {
				currentPath.length = i;
			}
			if (i >= currentPath.length) {
				var label = indent + s;
				if (label.length > specLength) {
					label = label.slice(0, specLength-3) + '...';
				}
				this.writeCommonMsg(label);

				if (i < path.length-1) {
					this.writeCommonMsg("\n");
				}
				else {
					this.writeCommonMsg(strmul(' ', specLength - label.length));
				}
				currentPath.push(s);
			}
			indent += "  ";
		}, this);
	};

	this.printResultLabel = function(result) {
		if (result === undefined) {
			this.writeCommonMsg(chalk.yellow(' ? '));
		} else if (result.skipped || result.skipped_some) {
			this.writeCommonMsg(chalk.yellow(' - '));
		} else if (result.success) {
			if (!result.partial) {
				this.writeCommonMsg(chalk.green(' ✓ '));
			} else {
				this.writeCommonMsg(chalk.yellow('(✓)'));
			}
		} else {
			this.writeCommonMsg(chalk.red(' ✗ '));
		}
	};

	this.printTableHeader = function(browsers) {
		this.writeCommonMsg(strmul(' ', specLength));
		this.writeCommonMsg(' all  ');
		browsers.forEach(function(browser, i) {
			this.writeCommonMsg(' '+  i + ' ');
		}, this);
		this.writeCommonMsg('\n');
	}

	this.onRunStart = function() {
		this._browsers = [];
		currentPath = [];
		specorder = [];
		specresults = Object.create(null);
	}


	this.renderBrowser = function(browser) {
	 	var results = browser.lastResult;
	 	var totalExecuted = results.success + results.failed;

	 	var msg = browser + ': Executed ' + totalExecuted + ' of ' + results.total;

	 	if (results.failed || results.skipped) {
		 	msg += ' (';

		 	if (results.failed) {
			 	msg += chalk.red(results.failed + ' Failed');
		 	}

		 	if (results.failed && results.skipped) {
			 	msg += ', '
		 	}

			if (results.skipped) {
			 	msg += chalk.yellow(results.skipped + ' Skipped');
		 	}

		 	msg += ') ';
	 	}

	 	if (browser.isReady) {
		 	msg += ' (' + helper.formatTimeInterval(results.totalTime) + ', ' + helper.formatTimeInterval(results.netTime) + ') ';
	 	}

		return msg;
	}

	this.onRunComplete = function(browsers, results) {
		this.writeCommonMsg('\n' + chalk.bold(chalk.underline('TEST SUMMARY:')) + '\n');
    if (browsers.length >= 1 && !results.disconnected && !results.error) {
			this.writeCommonMsg(chalk.green(' ✓ ' + this.successes.length + ' TESTS SUCCEEDED '));
			this.writeCommonMsg(chalk.green('(' + this.successes.length / browsers.length + ' per Browser)'))
			this.writeCommonMsg('\n');

			if (this.skipped) {
				this.writeCommonMsg(chalk.yellow(' - ' + this.skipped.length + ' TESTS SKIPPED '));
				this.writeCommonMsg(chalk.yellow('(' + this.skipped.length / browsers.length + ' per Browser)'))
				this.writeCommonMsg('\n');
			}

			if (this.failures) {
				this.writeCommonMsg(chalk.red(' ✗ ' + this.failures.length + ' TESTS FAILED '));
				this.writeCommonMsg(chalk.red('(' + this.failures.length / browsers.length + ' per Browser)'))
				this.writeCommonMsg('\n');
			}

			this.writeCommonMsg('\n' + chalk.bold(chalk.underline('BROWSER SUMMARY:')) + '\n');
    }

		// Browser overview
		browsers.forEach(function(browser, i) {
			this.writeCommonMsg(' ' + i + ': ' + this.renderBrowser(browser) + '\n');
		}, this);

		if (!specorder.length) {
			this.writeCommonMsg(chalk.red('No tests did run in any browsers.'));
			return;
		}

		var tableHeaderShown = false;

    this.writeCommonMsg('\n');

		// Test details
		var counts = { shown: 0, hidden: 0 };
		specorder.forEach(function(specid) {
			var sr = specresults[specid];
			// Collect information from all browsers
			var summary = { skipped_some: false, ran_some: false, success: true };
			browsers.forEach(function(b) {
				if (sr.results[b.id]) {
					if (sr.results[b.id].skipped) {
						summary.skipped_some = true;
					}
					else {
						summary.ran_some = true;
						summary.success = summary.success && sr.results[b.id].success;
					}
				}
				else {
					summary.skipped_some = true;
				}
			});

			// We want to actually display it
			if (!tableHeaderShown) {
				this.printTableHeader(browsers);
				tableHeaderShown = true;
			}

			this.printSpecLabel(sr.spec);
			this.writeCommonMsg(' ');
			this.printResultLabel(summary);
			this.writeCommonMsg('  ');

			browsers.forEach(function(browser, i) {
				this.printResultLabel(sr.results[browser.id], i);
			}, this);
			this.writeCommonMsg("\n");
			counts.shown++;
		}, this);

		if (counts.hidden) {
			this.writeCommonMsg("  " + chalk.green(''+counts.hidden) +
				(counts.shown ? " more" : "") +
				" test cases successful in all browsers\n")
		}

    if (browsers.length >= 1) {
        if (results.failed) {
					this.writeCommonMsg('\n' + chalk.bold(chalk.underline('FAILED TESTS:')) + '\n');
          this.logFinalErrors(this.failures);
        }
      }
	};
}

TraackrReporter.$inject = [
	'baseReporterDecorator',
  'formatError',
	'helper',
	'config'
];

module.exports = {
	'reporter:traackr': ['type', TraackrReporter]
};
