# karma-traackr-reporter
This reporter is intended to give a breakdown of test results in a way that is
quite clear exactly what has been run, skipped, or failed, and what the results
for the tests are on a browser-by-browser basis.

It is a standalone reporter, and is partially based on [Karma Summary Reporter](https://github.com/sth/karma-summary-reporter) which is really great,
but didn't offer quite as much as I wanted.

(Please note the blow screenshot is hacked together in Photoshop to not
demonstrate my entire test suite so it may contradict itself.)

![Example](/example.png?raw=true "Example Output")

## Installation
Install via NPM:

    npm install --save-dev karma-traackr-reporter

Add to your Karma Config (karma.conf.js):

    config.set({
      reporters: ['traackr']
    });
