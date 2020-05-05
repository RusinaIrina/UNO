import {
	EndTurn,
	GameState,
	GiveUp,
	PutCard,
	TakeCard,
	PlayerAction,
	PlayerId,
	Card
} from "../../common/messages";

class CardsInfo {
    public static readonly HEART: string = "♡";
    public static readonly DIAMOND: string = "♢";
    public static readonly CLUB: string = "♧";
    public static readonly SPADE: string = "♤";
    public static readonly AMOUNT_OF_CARDS: number = 36;
    public static readonly SINGLE_SUIT_CARDS_AMOUNT: number = 9;
}

const endTurn = document.querySelector('#endTurn') as HTMLElement;
const giveUp = document.querySelector('#btn_red_large') as HTMLElement;
const discard = document.querySelector('#discard-card') as HTMLElement;
const playCards = document.querySelector('#play-cards') as HTMLElement;

if ( !endTurn || !giveUp || !discard || !playCards) {
	throw new Error( 'Can\'t find required elements on "game" screen' );
}

let gameState: GameState = {
	gameCards: [],
	lastCard: undefined,
	player1: [],
	player2: [],
	playerId: 1
};

let playerId: PlayerId;

endTurn.addEventListener('click', onTurnClick);
giveUp.addEventListener('click', onGiveUpClick);
playCards.addEventListener('click', takeCard);

function takeCard() : void {
	const take: TakeCard = {
		name: 'takeCard'
	};
	turnHandler && turnHandler(take);
}

function onGiveUpClick() : void {
	const action : GiveUp = {
		name: 'giveUp',
		playerId: playerId
	};
	turnHandler && turnHandler(action);
}

function onTurnClick() : void {
	const endTurn : EndTurn = {
		name:'endTurn'
	};
	turnHandler && turnHandler(endTurn);
}

/**
 * Обработчик хода игрока
 */
type TurnHandler = ( action: PlayerAction ) => void;

/**
 * Обработчик хода игрока
 */
let turnHandler: TurnHandler;

 /**
  * Создать карту
  * @param class2 класс
  * @param name значение
  * @param suit масть
  * @param id1 чьи карты
  * @param id2 чей сейчас ход
  */
function makeCard(class2: string, name: string, suit: string) : HTMLElement {
    let elem = document.createElement('div') as HTMLElement;
    elem.className = 'card ' + class2;
    elem.innerHTML = `<div>${name}</div><div class="suit">${suit}</div><div class="card-name-bot">${name}</div>`; // положили в нее значение
    elem.addEventListener('click', putCard);
    return elem;
}

// положить карту в колоду сброса -----------------------------------------------------------------------------
function putCard(event: MouseEvent) : void {
	const eve = event.currentTarget as HTMLElement;
	
	let card: Card = {name: 0, suit: "a"};
	if (eve.textContent !== null) {
		card = {name: +eve.textContent[0], suit: eve.textContent[1]};
	}
	console.log(card);
	
	if (eve.textContent !== null && discard.textContent !== null && (eve.textContent[0] === discard.textContent[0] || eve.textContent[1] === discard.textContent[1])) {
		eve.removeEventListener('click', putCard);
		
		const action : PutCard = {
			name: 'putCard',
			card: card
		};
		turnHandler && turnHandler(action);
	}
}
// положить карту в колоду сброса -----------------------------------------------------------------------------

/**
 * Отрисовать карт игрока
 * @param player карты игрока
 */
function drawCards(player: Card[]): void {
	const hand = document.querySelector('.hand') as HTMLElement;
	hand.innerHTML = '';
    let class2: string;
    for (let i = 0; i < player.length; ++i) {
    	if (player[i].suit === CardsInfo.DIAMOND || player[i].suit === CardsInfo.HEART) {
            class2 = 'red-card';
        } else {
            class2 = 'black-card';
        }
        hand.append(makeCard(class2, player[i].name + player[i].suit, player[i].suit));
        //console.log(player[i].name + player[i].suit);
    }
}

/**
 * Отрисовать карт противника
 * @param size число карт противника
 */
function drawOpponentCards(size: number): void {
	const hand = document.querySelectorAll('.hand')[1] as HTMLElement;
	hand.innerHTML = '';
	let elem: HTMLElement;
	for (let i = 0; i < size; ++i) {
		elem = document.createElement('div');
        elem.className = 'card back-card';
		hand.append(elem);
    }
}

/**
 * Обновляет экран игры
 * @param game
 * @param color
 */
function update(game: GameState, id : PlayerId): void {
	gameState = game;
	playerId = id;
	let player1: Card[] = gameState.player1; // карты игрока
	let player2: Card[] = gameState.player2; // карты противника
	
	console.log(id + ', playerid: ' + gameState.playerId);
	console.log(CardsInfo.HEART + ' ' + "♡" + ' - ' + (CardsInfo.HEART === "♡"));

	if (id === 2) {
		let temp: Card[] = player1;
		player1 = player2;
		player2 = temp;
	}
	
	drawCards(player1);
	drawOpponentCards(player2.length);

	if (gameState.lastCard?.suit === CardsInfo.DIAMOND || gameState.lastCard?.suit === CardsInfo.HEART){
		discard.className = 'card3 red-card';
	} else {
		discard.className = 'card3 black-card';
	}
	discard.innerHTML = `<div>${gameState.lastCard?.name}${gameState.lastCard?.suit}</div><div class='suit'>${gameState.lastCard?.suit}</div><div class='card-name-bot'>${gameState.lastCard?.name}${gameState.lastCard?.suit}</div>`
}

//удаляются карты
function remove() : void {
	
}

/**
 * Устанавливает обработчик хода игрока
 *
 * @param handler Обработчик хода игрока
 */
function setTurnHandler(handler: TurnHandler): void {
	turnHandler = handler;
}

export {
	update,
	remove,
	setTurnHandler
};