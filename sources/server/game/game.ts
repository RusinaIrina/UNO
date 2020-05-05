import WebSocket from 'ws';
import { onError } from './on-error.js';

import {
	AnyClientMessage,
	AnyServerMessage,
	GameAbortedMessage,
	GameStartedMessage,
	GameState,
	PlayerMoveMessage,
	PlayerId,
	PutCard,
	Card
} from '../../common/messages.js';

class CardsInfo {
    public static readonly HEART: string = "♡";
    public static readonly DIAMOND: string = "♢";
    public static readonly CLUB: string = "♧";
    public static readonly SPADE: string = "♤";
    public static readonly AMOUNT_OF_CARDS: number = 36;
    public static readonly SINGLE_SUIT_CARDS_AMOUNT: number = 9;
}

/**
 * Случайно переставляет значения в массивве
 * @param array 
 */
function shuffle(array: Card[]): void {
	let currentIndex: number = array.length;
	let temporaryValue: Card;
	let randomIndex: number = 0;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
}

/**
 * Создает колоду для игры
 */
function generateRandomDeck(): Card[] {
	const cards: Card[] = [];
	const suits: string[] =
		[CardsInfo.CLUB,
		CardsInfo.DIAMOND,
		CardsInfo.HEART,
		CardsInfo.SPADE];
	console.log(suits);
	for (let j: number = 0; j < suits.length; ++j) { // suit in suits) {
		for (let i: number = 0; i < CardsInfo.SINGLE_SUIT_CARDS_AMOUNT; ++i) {
			cards.push({name: i, suit: suits[j]});
		}
	}
	shuffle(cards);
	return cards;
}

/**
 * Класс игры
 * 
 * Запускает игровую сессию.
 */
class Game {
	/**
	 * Количество игроков в сессии
	 */
	static readonly PLAYERS_IN_SESSION = 2;

	/**
	 * Игровая сессия
	 */
	private _session: WebSocket[];

	/**
	 * Информация о ходах игроков
	 */
	private _playersState!: WeakMap<WebSocket, PlayerId>;

	private _currentMove!: WebSocket;

	private _gameState!: GameState;

	private init(): void {
		let deck: Card[] = generateRandomDeck();
		const lastCard: Card | undefined = deck.pop();
		let hand1: Card[] = [];
		for (let i = 0; i < 4; ++i) {
			hand1.push(deck.pop()!);
		}
		let hand2: Card[] = [];
		for (let i = 0; i < 4; ++i) {
			hand2.push(deck.pop()!);
		}
		this._gameState = {
			gameCards: deck,
			lastCard: lastCard,
			player1: hand1,
			player2: hand2,
			playerId: 1
		};
	}

	/**
	 * @param session Сессия игры, содержащая перечень соединений с игроками
	 */
	constructor(session: WebSocket[]) {
		console.log("Game constructed");
		this._session = session;
		this.init();
		this._sendStartMessage()
			.then(
				() => {
					this._listenMessages();
				}
			)
			.catch(onError);
	}

	/**
	 * Уничтожает данные игровой сессии
	 */
	destroy(): void {
		// Можно вызвать только один раз
		this.destroy = () => { };

		for (const player of this._session) {
			if (
				(player.readyState !== WebSocket.CLOSED)
				&& (player.readyState !== WebSocket.CLOSING)
			) {
				const message: GameAbortedMessage = {
					type: 'gameAborted',
				};

				this._sendMessage(player, message)
					.catch(onError);
				player.close();
			}
		}

		// Обнуляем ссылки
		this._session = null as unknown as Game['_session'];
		this._playersState = null as unknown as Game['_playersState'];
	}
	/**
	 * Отправляет сообщение о начале игры
	 */
	private _sendStartMessage(): Promise<void[]> {
		console.warn("starting");
		this._playersState = new WeakMap<WebSocket, PlayerId>();
		this._currentMove = this._session[0];

		const data: GameStartedMessage = {
			gameState: this._gameState,
			type: 'gameStarted',
			playerId: 1
		};
		const promises: Promise<void>[] = [];

		for (const player of this._session) {
			promises.push(this._sendMessage(player, data));
			this._playersState.set(player, data.playerId);
			data.playerId = 2;
		}

		return Promise.all(promises);
	}

	/**
	 * Отправляет сообщение игроку
	 *
	 * @param player Игрок
	 * @param message Сообщение
	 */
	private _sendMessage(player: WebSocket, message: AnyServerMessage): Promise<void> {
		return new Promise(
			(resolve, reject) => {
				player.send(
					JSON.stringify(message),
					(error) => {
						if (error) {
							reject();

							return;
						}

						resolve();
					}
				)
			},
		);
	}

	/**
	 * Добавляет слушателя сообщений от игроков
	 */
	private _listenMessages(): void {
		for (const player of this._session) {
			player.on(
				'message',
				(data) => {
					const message = this._parseMessage(data);

					this._processMessage(player, message);
				},
			);

			player.on('close', () => this.destroy());
		}
	}

	/**
	 * Разбирает полученное сообщение
	 * 
	 * @param data Полученное сообщение
	 */
	private _parseMessage(data: unknown): AnyClientMessage {
		if (typeof data !== 'string') {
			return {
				type: 'incorrectRequest',
				message: 'Wrong data type',
			};
		}

		try {
			return JSON.parse(data);
		}
		catch (error) {
			return {
				type: 'incorrectRequest',
				message: 'Can\'t parse JSON data: ' + error,
			};
		}
	}

	/**
	 * Выполняет действие, соответствующее полученному сообщению
	 * 
	 * @param player Игрок, от которого поступило сообщение
	 * @param message Сообщение
	 */
	private _processMessage(player: WebSocket, message: AnyClientMessage): void {
		switch (message.type) {
			case 'playerMove':
				this._onPlayerMove(player, message);
				break;

			case 'repeatGame':
				this.init();
				this._sendStartMessage()
					.catch(onError);
				break;

			case 'incorrectRequest':
				this._sendMessage(player, message)
					.catch(onError);
				break;

			case 'incorrectResponse':
				console.error('Incorrect response: ', message.message);
				break;

			default:
				this._sendMessage(
					player,
					{
						type: 'incorrectRequest',
						message: `Unknown message type: "${(message as AnyClientMessage).type}"`,
					},
				)
					.catch(onError);
				break;
		}
	}

	private _onPlayerMove(player: WebSocket, message: PlayerMoveMessage): void {
		if (!this._checkMove(player) && message.action.name !== 'giveUp') return;
		switch (message.action.name) {
			case "giveUp":
				this._giveUp(player);
				return;

			case "endTurn":
				if (this._gameState.gameCards.length === 0)	{
					this._checkWin();
					return;
				}
				this._onPlayerRoll(player);
				break;
			
			case "putCard":
				this._putCard(player, message.action);
				this._onPlayerRoll(player);
				break;
				
			case "takeCard":
				if (this._gameState.gameCards.length > 0)	{
					this._takeCard(player);
				}
				break;
		}

		for (const player of this._session) {
			this._sendMessage(
				player,
				{
					type: 'changePlayer',
					gameState: this._gameState,
					playerId: this._playersState.get(player)!
				}
			).catch(onError);
		}
	}

	private _putCard(player: WebSocket, action: PutCard): void {
		let j: number = 0;
		if (this._playersState.get(player) === 1) {

			for (let i = 0; i < this._gameState.player1.length; ++i) {
				if (this._gameState.player1[i].name === action.card.name && this._gameState.player1[i].suit === action.card.suit) {
					j = i;
					break;
				}
			}
			for (let i = j; i < this._gameState.player1.length - 1; ++i) {
				this._gameState.player1[i] = this._gameState.player1[i + 1];
			}
			this._gameState.player1.pop();

		} else {

			for (let i = 0; i < this._gameState.player2.length; ++i) {
				if (this._gameState.player2[i].name === action.card.name && this._gameState.player2[i].suit === action.card.suit) {
					j = i;
					break;
				}
			}
			for (let i = j; i < this._gameState.player2.length - 1; ++i) {
				this._gameState.player2[i] = this._gameState.player2[i + 1];
			}
			this._gameState.player2.pop();

		}
		this._gameState.lastCard = action.card;
	}

	private _takeCard(player: WebSocket): void {
		const card: Card = this._gameState.gameCards.pop()!;
		if (this._playersState.get(player) === 1) {
			this._gameState.player1.push(card);
		} else {
			this._gameState.player2.push(card);
		}
	}

	private _giveUp(player: WebSocket): void {
		let winner: WebSocket = player;
		for (const gamer of this._session) {
			if (gamer !== player)
				winner = gamer;
		}
		this._sendMessage(
			winner,
			{
				type: 'gameResult',
				win: true,
			}
		).catch(onError);
		this._sendMessage(
			player,
			{
				type: 'gameResult',
				win: false,
			}
		).catch(onError);
	}

	// private _onBadRequest(message: string, player: WebSocket) : void
	// {
	// 	this._sendMessage(
	// 		player,
	// 		{
	// 			type: 'incorrectRequest',
	// 			message: message,
	// 		},
	// 	)
	// 		.catch( onError );
	// }

	private _checkMove(currentPlayer: WebSocket): boolean {
		if (this._currentMove != currentPlayer) {
			this._sendMessage(
				currentPlayer,
				{
					type: 'incorrectRequest',
					message: 'Not your turn',
				}
			).catch(onError);

			return false;
		}

		return true;
	}

	private _getScore(player: Card[]): number {
		let score: number = 0;
		for (let i = 0; i < player.length; ++i) {
			score += player[i].name;
		}
		return score;
	}

	private _whoWin() : PlayerId | null {
		let score1: number = this._getScore(this._gameState.player1);
		let score2: number = this._getScore(this._gameState.player2);
		if (score1 < score2)
			return 1;
		else if (score2 < score1)
			return 2;
		else 
			return null;
	}

	private _checkWin(): void {
		let winner: PlayerId | null = this._whoWin();
		if (winner === null) return;
		for (const player of this._session) {
			this._sendMessage(
				player,
				{
					type: 'gameResult',
					win: (this._playersState.get(player) === winner),
				},
			).catch(onError);
		}
	}

	/**
	 * Обрабатывает ход игрока
	 *
	 */
	private _onPlayerRoll(player: WebSocket): void {
		let player2: WebSocket | null = null;
		for (const man of this._session) {
			if (man !== player) player2 = man;
		}
		this._gameState.playerId = this._playersState.get(player2!)!;
		this._currentMove = player2!;
	}
}

export {
	Game
};
