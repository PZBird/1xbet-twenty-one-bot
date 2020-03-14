const Bot = require('node-telegram-bot-api');
const rp = require('request-promise');
const dotenv = require('dotenv');

dotenv.config();

const rootUrl = 'https://1xbet.com/LiveFeed';
const action = {
  games: '/BestGamesExtZip',
  game: '/GetGameZip',
};

const state = {
  0: 'не началась',
  1: 'ход игока',
  2: 'ход дилера',
  3: 'победа игрока',
  4: 'победа дилера',
};

const activeMsg = {};

const mast = {
  0: '♠️',
  1: '♣️',
  2: '♦️',
  3: '♥️',
};

const cardValue = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const gamesConsts = {
  sports: 146,
  count: 100,
  lng: 'ru',
  mode: 4,
  country: 75,
};

const gameConsts = {
  sports: 146,
  cfview: 0,
  isSubGames: true,
  GroupEvents: true,
  allEventsGroupSubGames: true,
  countevents: 250,
  grMode: 2,
};

const telegramToken = checkEnvironments('TELEGRAM_TOKEN');
const bot = new Bot(telegramToken, { polling: true });
const tSubscryber = checkEnvironments('TELEGRAM_CHANNEL');

// Бытует мнение, что эти комбинации, сулят скорый выйгрыш, сам не уверен.
function signals(cart, game, sp){
  let signal = false;
  let signalMsg = `[${game}] Сигнал: `;
  if (sp) {
    signal = true;
    signalMsg += '6♠️';
  }
  if (cart[14] && cart[14] >= 2) {
    signal = true;
    signalMsg += 'ТУЗ,ТУЗ; ';
  }
  if (cart[6]) {
    if(!!cart[8]){
      signal = true;
      signalMsg += '6,8; ';
    }
    if(!!cart[7] && !!cart[12]){
      signal = true;
      signalMsg += '6,7,ДАМА; ';
    }
  }
  if (!!cart[10] && !!cart[13]) {
    signal = true;
    signalMsg += 'король,10; ';
  }
  if (signal) sendMessage(signalMsg);
}

async function checkGamesData(games){
  const game = await checkGame(games.I);
  if (!game) return null;
  const gameObject = JSON.parse(game);

  if (gameObject.Value) {
    const state = gameObject.Value.SC.S[2].Value;
    if (['3','4','5'].includes(state)) {
      const P1 = JSON.parse(gameObject.Value.SC.S[0].Value);
      const P2 = JSON.parse(gameObject.Value.SC.S[1].Value);
      let P1text ='';
      let P2text ='';
      let endPhrase = '';
      if (P1.length === 2 && P2.length === 2){
        endPhrase = '#R ';
        if (P1[0].CV === P1[1].CV && P1[1].CV === 14) endPhrase += '#G ';
        if (P2[0].CV === P2[1].CV && P2[1].CV === 14) endPhrase += '#G ';
      }
      const carts = {};
      let sp = false;
      for (let index = 0; index < P1.length; index++) {
        const card = P1[index];
        P1text += `${cardValue[card.CV]}${mast[card.CS]}`;
        if (!sp) sp = card.CV === 6 && card.CS === 0;
        carts[card.CV] = carts[card.CV]
          ? carts[card.CV] += 1 : carts[card.CV] = 1;
      }
      for (let index = 0; index < P2.length; index++) {
        const card = P2[index];
        P2text += `${cardValue[card.CV]}${mast[card.CS]}`;
        if (!sp) sp = card.CV === 6 && card.CS === 0;
        carts[card.CV] = carts[card.CV]
          ? carts[card.CV] += 1 : carts[card.CV] = 1;
      }
      if (gameObject.Value.SC.FS.S1 === gameObject.Value.SC.FS.S2) {
        endPhrase += '#N';
      }
      let msg = `[${gameObject.Value.DI}]: ${gameObject.Value.SC.FS.S1}:(${P1text}) - ${gameObject.Value.SC.FS.S2}:(${P2text})${endPhrase}`;
      if (activeMsg[gameObject.Value.DI] && activeMsg[gameObject.Value.DI].sended) {
        if (activeMsg[gameObject.Value.DI].msg !== msg) {
          signals(carts, gameObject.Value.DI, sp);
          editMessage(msg, activeMsg[gameObject.Value.DI]);
          delete activeMsg[gameObject.Value.DI];
        }
        return null;
      }
      if (activeMsg[gameObject.Value.DI] && !activeMsg[gameObject.Value.DI].sended) {
        if (!activeMsg[gameObject.Value.DI].msg || activeMsg[gameObject.Value.DI].msg !== msg) {
          signals(carts, gameObject.Value.DI, sp);
          sendMessage(msg);
          delete activeMsg[gameObject.Value.DI];
        }
        return null;
      }
    } else if (['1','2'].includes(state)) {
      const P1 = JSON.parse(gameObject.Value.SC.S[0].Value);
      const P2 = JSON.parse(gameObject.Value.SC.S[1].Value);
      let P1text ='';
      let P2text ='';
      for (let index = 0; index < P1.length; index++) {
        const card = P1[index];
        P1text += `${cardValue[card.CV]}${mast[card.CS]}`;
      }
      for (let index = 0; index < P2.length; index++) {
        const card = P2[index];
        P2text += `${cardValue[card.CV]}${mast[card.CS]}`;
      }
      let msg = `⏱[${gameObject.Value.DI}]: ${gameObject.Value.SC.FS.S1}:(${P1text}) - ${gameObject.Value.SC.FS.S2}:(${P2text})`;
      if (
        activeMsg[gameObject.Value.DI]
          && !activeMsg[gameObject.Value.DI].locked
          && !activeMsg[gameObject.Value.DI].sended
        ) {
        activeMsg[gameObject.Value.DI] = {
          sended: true,
          msg,
          locked: true,
        };
        chat = await sendMessage(msg);
        return activeMsg[gameObject.Value.DI] = {
          sended: true,
          msg,
          locked: false,
          ...chat,
        };
      }
      if (
        activeMsg[gameObject.Value.DI]
          && !activeMsg[gameObject.Value.DI].locked
          && activeMsg[gameObject.Value.DI].sended) {
        if (activeMsg[gameObject.Value.DI].msg === msg) return;
        editMessage(msg, activeMsg[gameObject.Value.DI]);
        return activeMsg[gameObject.Value.DI] = {
          ...activeMsg[gameObject.Value.DI],
          sended: true,
          msg,
          locked: false,
        };
      }
    } else if (state === '0') {
      if (!!activeMsg[gameObject.Value.DI] ) return;
      activeMsg[gameObject.Value.DI] = {
        sended: false,
        msg: ''
      };
      // ToDo новая игра
    } else {
      console.log(state, JSON.stringify(state));
    }
  }
}

async function checkGame(id) {
  try {
    return await rp.get({
      uri: `${rootUrl}${action.game}`,
      qs: { id ,...gameConsts },
      timeout: 150,
    });
  } catch (err) {
    if (err.cause.code === 'ECONNREFUSED') return null;
  }
}

async function checkGames(){
  try {
    return await rp.get({
      uri: `${rootUrl}${action.games}`,
      qs: { ...gamesConsts },
      timeout: 150,
    });    
  } catch (err) {
    if (err.cause.code === 'ECONNREFUSED') return null;
  }
}

async function getGames(){
  const games = await checkGames();
  if (!games) return null;
  try {
    const gamesObject = JSON.parse(games);
    if (
        gamesObject
        && gamesObject.Value
        && gamesObject.Value.length
        && gamesObject.Value.length > 0
      ){
      for (let element of gamesObject.Value) {
        await checkGamesData(element);
      }
    }
  } catch (error) {
    sendError(error);
    return 0;
  }
}

async function startCheck() {
  setInterval(async () => {
    await getGames();
  }, 1000);
}

async function sendError(err) {
    console.log('Send error: ' +  err);
}

async function sendMessage(msg) {
    return await bot.sendMessage(tSubscryber, msg);
}

async function editMessage(msg, chat) {
    return await bot.editMessageText(msg, { ...chat, chat_id: chat.chat.id, message_id: chat.message_id });
}

function checkEnvironments(key) {
  if (process.env[key]) return process.env[key];
  console.error(`Please, set ${key} environment variable`);
  process.exit(1);
}

startCheck();
