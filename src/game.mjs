import { print, error, includes, auto } from "./utils.mjs";

// Piece color
export const Color = {
    WHITE: auto(),
    BLACK: auto(),
};

// Kinds of pieces
export const PieceKind = {
    PAWN: auto(),
    QUEEN: auto(),
    KING: auto(),
    BISHOP: auto(),
    ROOK: auto(),
    KNIGHT: auto(),
};

// [x, y] are within the board bounds
export function is_bdd([x, y]) {
    return 0 <= x && x < 8 && 0 <= y && y < 8;
}

// Simple class storing the piece information
export class Piece {
    constructor(color, kind) {
        this.color = color;
        this.kind = kind;
        this.has_moved = false;
        this.at_end = false;
    }
}

// Stores the board and piece positions
export class Board {
    constructor(state) {
        this.state = state;
    }

    // what is a [x, y] position of the board
    at([x, y]) {
        return this.state[y][x];
    }

    // set p at [x, y] position of the board
    set_at([x, y], p) {
        this.state[y][x] = p;
    }

    // collect all the position in the direction [dx, dy]
    reachable_moves_in_dir([x, y], [dx, dy]) {
        const moves = [];
        const p = this.at([x, y]);

        for (let i = 1; i < 8; i += 1) {
            const pos = [x + i * dx, y + i * dy];
            if (!is_bdd(pos)) continue;

            const p_at_pos = this.at(pos);
            if (p_at_pos !== null) {
                if (p_at_pos.color !== p.color) {
                    moves.push(pos);
                }
                break;
            } else {
                moves.push(pos);
            }
        }
        return moves;
    }

    // collect all the position where `color` pieces are present
    color_positions(color) {
        const positions = [];
        for (let y = 0; y < 8; y += 1) {
            for (let x = 0; x < 8; x += 1) {
                if (this.at([x, y]) && this.at([x, y]).color === color) {
                    positions.push([x, y]);
                }
            }
        }
        return positions;
    }

    // find all the locations where pieces with kind `kind` and color `color` are
    where(kind, color) {
        const positions = [];
        for (let y = 0; y < 8; y += 1) {
            for (let x = 0; x < 8; x += 1) {
                const p = this.at([x, y]);
                if (p && p.color === color && p.kind === kind) {
                    positions.push([x, y]);
                }
            }
        }
        return positions;
    }

    // update the board position by move piece at `src` to `dst` and return a new board
    move(src, dst) {
        if (this.at(dst) && this.at(dst).kind === PieceKind.KING) return;

        const new_state = new Board(structuredClone(this.state));
        const p = new_state.at(src);
        new_state.set_at(src, null);
        new_state.set_at(dst, p);

        if (!p.has_moved) p.has_moved = true;
        if (dst[1] === 0 || dst[1] === 7) {
            p.at_end = true;
            if (p.kind === PieceKind.PAWN) {
                p.kind = PieceKind.QUEEN;
            }
        }
        return new_state;
    }
}

function bishop(board, pos) {
    return [
        ...board.reachable_moves_in_dir(pos, [-1, -1]),
        ...board.reachable_moves_in_dir(pos, [+1, +1]),
        ...board.reachable_moves_in_dir(pos, [-1, +1]),
        ...board.reachable_moves_in_dir(pos, [+1, -1]),
    ];
}

function rook(board, pos) {
    return [
        ...board.reachable_moves_in_dir(pos, [-1, 0]),
        ...board.reachable_moves_in_dir(pos, [+1, 0]),
        ...board.reachable_moves_in_dir(pos, [0, -1]),
        ...board.reachable_moves_in_dir(pos, [0, +1]),
    ];
}

function queen(board, pos) {
    return [...rook(board, pos), ...bishop(board, pos)];
}

function knight(board, [x, y]) {
    const possible_moves = [
        [x - 1, y - 2],
        [x + 1, y - 2],
        [x - 1, y + 2],
        [x + 1, y + 2],
        [x - 2, y - 1],
        [x - 2, y + 1],
        [x + 2, y + 1],
        [x + 2, y - 1],
    ].filter(is_bdd);

    const p = board.at([x, y]);
    const moves = [];
    for (const pos of possible_moves) {
        const piece = board.at(pos);
        if (piece === null || piece.color !== p.color) {
            moves.push(pos);
        }
    }
    return moves;
}

function king(board, [x, y]) {
    const possible_moves = [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
        [x - 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y - 1],
        [x + 1, y + 1],
    ].filter(is_bdd);

    const p = board.at([x, y]);
    const moves = [];
    for (const pos of possible_moves) {
        const piece = board.at(pos);
        if (piece === null || piece.color !== p.color) {
            moves.push(pos);
        }
    }
    return moves;
}

function pawn(board, [x, y]) {
    const p = board.at([x, y]);
    const f = p.color == Color.BLACK ? -1 : 1;

    const capture_moves = [
        [x - f, y - f],
        [x + f, y - f],
    ].filter(is_bdd);

    let normal_moves = [
        [x, y - f],
        [x, y - 2 * f],
    ].filter(is_bdd);

    if (p.has_moved) {
        normal_moves = normal_moves.slice(0, 1);
    }

    const moves = [];
    for (const pos of capture_moves) {
        if (board.at(pos) === null) continue;
        if (board.at(pos).color !== p.color) {
            moves.push(pos);
        }
    }

    const [a, b] = normal_moves;
    if (a && board.at(a) === null) {
        moves.push(a);
    }
    if (b && board.at(b) === null) {
        moves.push(b);
    }
    return moves;
}

// given the board and position collect all the valid moves
// of the piece at the position
export function piece_switch(board, pos) {
    const kind = board.at(pos).kind;
    if (kind === PieceKind.KING) return king(board, pos);
    if (kind === PieceKind.KNIGHT) return knight(board, pos);
    if (kind === PieceKind.ROOK) return rook(board, pos);
    if (kind === PieceKind.QUEEN) return queen(board, pos);
    if (kind === PieceKind.PAWN) return pawn(board, pos);
    if (kind === PieceKind.BISHOP) return bishop(board, pos);
    error(`invalid piece ${kind} at ${pos}`);
}

export function is_in_check(board, turn) {
    const opponent_color = turn === Color.WHITE ? Color.BLACK : Color.WHITE;
    const opponent_positions = board.color_positions(opponent_color);
    const king_pos = board.where(PieceKind.KING, turn)[0];

    const opponent_moves = [];
    for (const pos of opponent_positions) {
        if (includes(piece_switch(board, pos), king_pos)) {
            return true;
        }
    }
    return false;
}

export function is_checkmate(board, turn) {
    if (!is_in_check(board, turn)) return false;
    const legal_moves = [];
    for (const pos of board.color_positions(turn)) {
        for (const dst of piece_switch(board, pos)) {
            legal_moves.push([pos, dst]);
        }
    }

    for (const move of legal_moves) {
        const [src, dst] = move;
        const tmp_board = board.move(src, dst);
        if (!is_in_check(tmp_board, turn)) {
            return false;
        }
    }
    return true;
}

export function is_stalemate(board, turn) {
    if (is_in_check(board, turn)) return false;

    const legal_moves = [];
    for (const pos of board.color_positions(turn)) {
        for (const dst of piece_switch(board, pos)) {
            legal_moves.push([pos, dst]);
        }
    }
    return legal_moves.length === 0;
}

export function update(src, dst) {}

export default {
    Piece,
    Board,
    Color,
    PieceKind,
    is_bdd,
    is_stalemate,
    is_checkmate,
    is_in_check,
    piece_switch,
    update,
};
