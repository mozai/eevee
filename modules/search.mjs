'use strict';

// Search module
// Provides:
/*

Done 03:37 Honk ║ >               ?g  <term>                       Search Google
Done 03:37 Honk ║ >             ?gif  <term>                       Search Google Images (top gif)
Skipped 03:37 Honk ║ >            ?gifr  <term>                       Search Google Images (random gif)
Done 03:37 Honk ║ >              ?im  <term>                       Search Google Images (top)
Skipped 03:37 Honk ║ >              ?ir  <term>                       Search Google Images (random)
Skipped 03:37 Honk ║ >              ?tr  <term>                       Search Twitter (random tweet)
Done 03:37 Honk ║ >              ?tu  <term>                       Search Google Images (top Tumblr)
Skipped 03:37 Honk ║ >             ?tur  <term>                       Search Google Images (random Tumblr)
03:37 Honk ║ >              ?tw  <term>                       Search Twitter (top tweet)
03:37 Honk ║ >              ?ud  <what>                       Do an urban dictionary search
03:37 Honk ║ >              ?yt  <term>                       Search YouTube

*/

const ident = 'search';
const debug = true;

import { default as clog } from 'ee-log';
import { default as google } from 'googlethis';
import { default as ircColor } from 'irc-colors';

import { ipc, lockPidFile, handleSIGINT, setPingListener } from '../lib/common.mjs';

lockPidFile(ident);

setPingListener(ipc, ident, 'init');

const help = [
  {
    command: 'g',
    descr: 'Google search',
    params: [
      {
        param: 'query',
        required: true,
        descr: 'The search to run',
      },
    ],
  },
  {
    command: 'im',
    descr: 'Image search',
    params: [
      {
        param: 'query',
        required: true,
        descr: 'The search to run',
      },
    ],
  },
  {
    command: 'gif',
    descr: 'Gif search',
    params: [
      {
        param: 'query',
        required: true,
        descr: 'The search to run',
      },
    ],
  },
  {
    command: 'tu',
    descr: 'Tumblr image search',
    params: [
      {
        param: 'query',
        required: true,
        descr: 'The search to run',
      },
    ],
  },
];

// Things that need to be done once the ipc is "connected"
ipc.on('start', () => {
  if (debug) clog.debug('IPC "connected"');
  if (process.send) process.send('ready');
  ipc.publish(
    '_help.update',
    JSON.stringify({
      from: ident,
      help: help,
    }),
  );
  setPingListener(ipc, ident, 'running');
});

process.on('SIGINT', () => {
  handleSIGINT(ident, ipc);
});

ipc.subscribe('_help.updateRequest', () => {
  ipc.publish(
    '_help.update',
    JSON.stringify({
      from: ident,
      help: help,
    }),
  );
});

// Google search
ipc.subscribe('g.request', async (data) => {
  const request = JSON.parse(data);
  const params = {
    page: 0,
    safe: false,
    additional_params: {
      hl: 'en',
    },
  };
  googleSearch(request, params);
});

// Image Search
ipc.subscribe('im.request', async (data) => {
  const request = JSON.parse(data);
  if (debug) clog.debug('Image request', request);
  const params = {
    page: 0,
    safe: false,
    additional_params: {
      hl: 'en',
    },
  };
  googleImageSearch(request, params);
});

// Gif search
ipc.subscribe('gif.request', async (data) => {
  const request = JSON.parse(data);
  if (debug) clog.debug('Gif request', request);
  const params = {
    page: 0,
    safe: false,
    additional_params: {
      hl: 'en',
      tbs: 'itp:animated',
    },
  };
  googleImageSearch(request, params);
});

// Image search - restricted to tumblr
ipc.subscribe('tu.request', async (data) => {
  const request = JSON.parse(data);
  if (debug) clog.debug('Tumblr request', request);
  const params = {
    page: 0,
    safe: false,
    additional_params: {
      hl: 'en',
      //as_occt: 'media.tumblr.com',
      as_sitesearch: 'tumblr.com',
    },
  };
  googleImageSearch(request, params);
});

function googleSearch(request, params) {
  var outputString = '';
  google
    .search(request.args, params)
    .then((results) => {
      if (debug) clog.debug(results);
      if (results.length != 0) {
        const selectedResult = results.results[Math.floor(Math.random() * results.results.length)];
        clog.error(selectedResult);
        clog.debug(selectedResult.title, selectedResult.url);
        if (request.platform === 'irc') {
          outputString = `${ircColor.blue(selectedResult.title)} | ${selectedResult.url}`;
        } else {
          outputString = `${selectedResult.title} | ${selectedResult.link}`;
        }
      } else {
        outputString = ircColor.red('No results?!?!');
      }
      const reply = {
        target: request.channel,
        text: outputString,
      };
      if (debug) clog.debug(`Sending reply to: ${request.replyTo}.outgoingMessage`, reply);
      ipc.publish(`${request.replyTo}.outgoingMessage`, JSON.stringify(reply));
      return;
    })
    .catch((error) => {
      clog.error(error.message);
      const reply = {
        target: request.channel,
        text: ircColor.red(error.message),
      };
      if (debug) clog.debug(`Sending reply to: ${request.replyTo}.outgoingMessage`, reply);
      ipc.publish(`${request.replyTo}.outgoingMessage`, JSON.stringify(reply));
      return;
    });
}

function googleImageSearch(request, params) {
  google
    .image(request.args, params)
    .then((results) => {
      if (debug) clog.debug(results);
      var outputString = '';
      if (results.length != 0) {
        const selectedResult = results[Math.floor(Math.random() * results.length)];
        clog.error(selectedResult);
        clog.debug(selectedResult.title, selectedResult.url);
        if (request.platform === 'irc') {
          outputString = `${ircColor.blue(selectedResult.origin.title)} | ${selectedResult.url}`;
        } else {
          outputString = `${selectedResult.origin.title} | ${selectedResult.link}`;
        }
      } else {
        outputString = ircColor.red('No results?!?!');
      }
      const reply = {
        target: request.channel,
        text: outputString,
      };
      if (debug) clog.debug(`Sending reply to: ${request.replyTo}.outgoingMessage`, reply);
      ipc.publish(`${request.replyTo}.outgoingMessage`, JSON.stringify(reply));
      return;
    })
    .catch((error) => {
      clog.error(error.message);
      const reply = {
        target: request.channel,
        text: ircColor.red(error.message),
      };
      if (debug) clog.debug(`Sending reply to: ${request.replyTo}.outgoingMessage`, reply);
      ipc.publish(`${request.replyTo}.outgoingMessage`, JSON.stringify(reply));
      return;
    });
}
