export type PlayerId = 1|2;
/**
 * Начало игры
 */
export type GameStartedMessage = {
	/** Тип сообщения */
	type: 'gameStarted';
	/** Мой ход? */
	gameState: GameState;
	playerId: PlayerId;
};

/**
 * Игра прервана
 */
export type GameAbortedMessage = {
	/** Тип сообщения */
	type: 'gameAborted';
};

export type EndTurn = {
	name: 'endTurn';
};

export type GiveUp = {
	name: 'giveUp';
	playerId: PlayerId;
};

export type Card = {
	/** Значение */
	name: number;
	/** Масть */
	suit: string;
}

export type PlayerState = {
	playerId: PlayerId;
};

export type GameState = {
	/** Карты в игровой колоде */
	gameCards: Array<Card>;
	/** Последняя карта в колоде сброса */
	lastCard?: Card;
	/** Карты 1го игрока */
	player1: Array<Card>;
	/** Карты 2го игрока */
	player2: Array<Card>;
	/** Чей сейчас ход */
	playerId: PlayerId;
};

export type PutCard = {
	name: 'putCard',
	card: Card
}

export type TakeCard = {
	name: 'takeCard'
}

export type PlayerAction = EndTurn | GiveUp | PutCard | TakeCard;

/**
 * Ход игрока
 */
export type PlayerMoveMessage = {
	/** Тип сообщения */
	type: 'playerMove';
	/** Число, названное игроком */
	action: PlayerAction;
};

/**
 * Результат хода игроков
 */
export type GameResultMessage = {
	/** Тип сообщения */
	type: 'gameResult';
	/** Победа? */
	win: boolean;
};

/**
 * Смена игрока
 */
export type ChangePlayerMessage = {
	/** Тип сообщения */
	type: 'changePlayer';
	/** Мой ход? */
	gameState: GameState;
	playerId: PlayerId;
};

/**
 * Повтор игры
 */
export type RepeatGame = {
	/** Тип сообщения */
	type: 'repeatGame';
};

/**
 * Некорректный запрос клиента
 */
export type IncorrectRequestMessage = {
	/** Тип сообщения */
	type: 'incorrectRequest';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Некорректный ответ сервера
 */
export type IncorrectResponseMessage = {
	/** Тип сообщения */
	type: 'incorrectResponse';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Сообщения от сервера к клиенту
 */
export type AnyServerMessage =
	| GameStartedMessage
	| GameAbortedMessage
	| GameResultMessage
	| ChangePlayerMessage
	| IncorrectRequestMessage
	| IncorrectResponseMessage;

/** 
 * Сообщения от клиента к серверу
 */
export type AnyClientMessage =
	| PlayerMoveMessage
	| RepeatGame
	| IncorrectRequestMessage
	| IncorrectResponseMessage;
