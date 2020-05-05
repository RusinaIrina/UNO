import { listenMessages } from './connection.js';
import { onMessage } from './on-message.js';
//console.log("Game started");
listenMessages( onMessage );
