import utils from "./utils.mjs";

const [BW, BH] = [600, 600];
const [TW, TH] = [Math.floor(BW / 8), Math.floor(BH / 8)];
const render = document.getElementById("render");
utils.set_properties(render, {
    style: {
        position: "relative",
        width: `${BW}px`,
        height: `${BH}px`,
    },
});

utils.set_properties(document.getElementById("board"), {
    style: {
        position: "absolute",
        width: `${BW}px`,
        height: `${BH}px`,
        zIndex: 1,
    },
});

const ASSETS = "./assets";
const IMAGES = {
    bb: "bb.svg",
    bw: "bw.svg",
    kb: "kb.svg",
    kw: "kw.svg",
    nb: "nb.svg",
    nw: "nw.svg",
    pb: "pb.svg",
    pw: "pw.svg",
    qb: "qb.svg",
    qw: "qw.svg",
    rb: "rb.svg",
    rw: "rw.svg",
};

class BoardState {
    constructor(start_state) {
        this.positions = [];
        this.state = start_state;
        this.pawns_state = {};

        for (let y = 0; y < 8; y += 1) {
            for (let x = 0; x < 8; x += 1) {
                const p = this.at([x, y]);
                if (p[0] === "p") {
                    this.pawns_state[p] = true;
                }
                this.positions.push([x, y]);
            }
        }
    }

    static start() {
        return new BoardState([
            ["rb", "nb", "bb", "qb", "kb", "bb", "nb", "rb"],
            ["pb0", "pb1", "pb2", "pb3", "pb4", "pb5", "pb6", "pb7"],
            ["", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", ""],
            ["pw0", "pw1", "pw2", "pw3", "pw4", "pw5", "pw6", "pw7"],
            ["rw", "nw", "bw", "qw", "kw", "bw", "nw", "rw"],
        ]);
        // return new BoardState([
        //     ["rb", "", "bb", "kb", "", "", "nb", "rb"],
        //     ["pb0", "", "", "pb1", "", "pb2", "nw", "pb3"],
        //     ["nb", "", "", "bw", "", "", "", ""],
        //     ["", "", "", "", "", "", "", ""],
        //     ["", "", "", "", "", "", "", ""],
        //     ["", "", "", "", "", "qw", "", ""],
        //     ["", "", "", "", "", "", "", ""],
        //     ["", "", "", "", "", "", "", ""],
        // ]);
    }

    at([x, y]) {
        return this.state[y][x];
    }

    set_at([x, y], p) {
        this.state[y][x] = p;
    }

    is_empty_at(pos) {
        return this.at(pos) === "";
    }

    is_bounded([x, y]) {
        return 0 <= x && x < 8 && 0 <= y && y < 8;
    }

    where(p) {
        for (const pos of this.positions) {
            if (this.at(pos) === p) return pos;
        }
        return null;
    }

    copy() {
        return new BoardState(structuredClone(this.state));
    }

    positions_of_color(color) {
        const positions = [];
        for (const pos of this.positions) {
            if (this.is_empty_at(pos)) continue;
            if (this.at(pos)[1] === color) positions.push(pos);
        }
        return positions;
    }

    reachable_moves_in_direction([x, y], [dx, dy]) {
        const moves = [];
        const pos = [x, y];
        const p = this.at(pos);

        for (let i = 1; i < 8; i += 1) {
            const pos = [x + i * dx, y + i * dy];
            if (!this.is_bounded(pos)) continue;

            if (!this.is_empty_at(pos)) {
                if (this.at(pos)[1] !== p[1]) moves.push(pos);
                break;
            }
            if (this.is_empty_at(pos)) moves.push(pos);
        }
        return moves;
    }

    update(src, dst) {
        const p = this.at(src);
        this.set_at(src, "");
        this.set_at(dst, p);
    }
}

function pawn(board, [x, y]) {
    const p = board.at([x, y]);
    const f = p[1] == "b" ? -1 : 1;

    const capture_moves = [
        [x - 1 * f, y - 1 * f],
        [x + 1 * f, y - 1 * f],
    ].filter(board.is_bounded);

    const normal_moves = [
        [x, y - 1 * f],
        [x, y - 2 * f],
    ].filter(board.is_bounded);

    const moves = [];
    for (const pos of capture_moves) {
        if (board.is_empty_at(pos)) continue;
        if (board.at(pos)[1] !== p[1]) {
            moves.push(pos);
        }
    }

    if (normal_moves) {
        if (board.is_empty_at(normal_moves[0])) moves.push(normal_moves[0]);
        if (
            board.is_empty_at(normal_moves[0]) &&
            board.is_empty_at(normal_moves[1]) &&
            board.pawns_state[p]
        )
            moves.push(normal_moves[1]);
    }
    return moves;
}

function future_position_in_check(board, future_pos, our_color) {
    const opponent = our_color === "w" ? "b" : "w";
    const opponent_positions = board.positions_of_color(opponent);
    const opponent_moves = [];
    for (const pos of opponent_positions) {
        if (utils.includes(piece_switch(board, pos, our_color), future_pos))
            return true;
    }
    return false;
}

function king(board, [x, y], turn) {
    const adjacents = [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
    ].filter(board.is_bounded);

    const p = board.at([x, y]);
    const turn_color = turn === 0 ? "w" : "b";
    const moves = [];
    for (const pos of adjacents) {
        if (turn_color === p[1] && future_position_in_check(board, pos, p[1]))
            continue;
        if (board.is_empty_at(pos) || board.at(pos)[1] !== p[1]) {
            moves.push(pos);
        }
    }
    return moves;
}

function rook(board, pos) {
    return [
        ...board.reachable_moves_in_direction(pos, [-1, 0]),
        ...board.reachable_moves_in_direction(pos, [+1, 0]),
        ...board.reachable_moves_in_direction(pos, [0, -1]),
        ...board.reachable_moves_in_direction(pos, [0, +1]),
    ];
}

function queen(board, pos) {
    return [...new Set(rook(board, pos)), ...new Set(bishop(board, pos))];
}

function bishop(board, pos) {
    return [
        ...board.reachable_moves_in_direction(pos, [-1, -1]),
        ...board.reachable_moves_in_direction(pos, [+1, +1]),
        ...board.reachable_moves_in_direction(pos, [-1, +1]),
        ...board.reachable_moves_in_direction(pos, [+1, -1]),
    ];
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
    ].filter(board.is_bounded);

    const p = board.at([x, y]);
    const moves = [];
    for (const pos of possible_moves) {
        if (board.is_empty_at(pos) || board.at(pos)[1] !== p[1]) {
            moves.push(pos);
        }
    }
    return moves;
}

function piece_switch(board, src, turn) {
    const p = board.at(src);
    switch (p[0]) {
        case "q":
            return queen(board, src);
        case "p":
            return pawn(board, src);
        case "r":
            return rook(board, src);
        case "k":
            return king(board, src, turn);
        case "b":
            return bishop(board, src);
        case "n":
            return knight(board, src);
        default:
            utils.error(`invalid piece: ${p} at ${src}`);
    }
}

class GameState {
    constructor() {
        this.board_state = BoardState.start();
        this.turn = 0;
        /*
            0: PLAY
            1: CHECK
            2: CHECKMATE
        */
        this.state = 0;
        this.selected = null;
        this.highlights = [];
        this.table = [
            ["b", "kw"],
            ["w", "kb"],
        ];
    }

    turn_update() {
        this.turn = +!this.turn;
    }

    turn_color() {
        return this.turn === 0 ? "w" : "b";
    }

    opponent_color() {
        return this.turn === 0 ? "b" : "w";
    }

    turn_king() {
        return this.turn === 0 ? "kw" : "kb";
    }

    is_pickable(pos) {
        if (this.board_state.is_empty_at(pos)) return false;
        return this.board_state.at(pos)[1] === this.turn_color();
    }

    is_king_checked(board) {
        const king_pos = board.where(this.turn_king());
        const opponent = this.opponent_color();
        const opponent_positions = board.positions_of_color(opponent);
        for (const pos of opponent_positions) {
            const moves = piece_switch(board, pos, this.turn);
            if (utils.includes(moves, king_pos)) return [true, pos];
        }
        return [false, null];
    }

    is_checkmate(board) {
        const king_pos = board.where(this.turn_king());
        const king_moves = piece_switch(board, king_pos, this.turn);
        const [yes, checker] = this.is_king_checked(board);
        if (yes) {
            const our_positions = board.positions_of_color(this.turn_color());
            for (const pos of our_positions) {
                if (
                    utils.includes(piece_switch(board, pos, this.turn), checker)
                )
                    return false;
            }
        }
        return king_moves.length === 0 && this.is_king_checked(board)[0];
    }

    render() {
        utils.remove_elements_with_classname("piece");
        utils.remove_elements_with_classname("highlight");
        const render = document.getElementById("render");

        this.highlights.forEach((hl) => {
            const [x, y] = hl;
            const hl_el = utils.create_element("img", {
                className: "highlight",
                src: `${ASSETS}/highlight.svg`,
                style: {
                    position: "absolute",
                    left: `${x * TW + TW / 4}px`,
                    top: `${y * TH + TH / 4}px`,
                    width: `${TW / 2}px`,
                    height: `${TH / 2}px`,
                    opacity: 0.4,
                    zIndex: 2,
                },
            });
            render.appendChild(hl_el);
        });

        this.board_state.positions.forEach((pos) => {
            const [x, y] = pos;
            const p = this.board_state.at(pos);
            if (p === "") return;

            const piece_img = utils.create_element("img", {
                src: `${ASSETS}/${IMAGES[p.slice(0, 2)]}`,
                className: "piece",
                width: TW,
                height: TH,
                style: {
                    position: "absolute",
                    left: `${x * TW}px`,
                    top: `${y * TH}px`,
                    zIndex: 3,
                },
            });
            render.appendChild(piece_img);
        });
    }

    reset_selected() {
        this.selected = null;
        this.highlights = [];
    }

    is_valid_destination(pos) {
        return utils.includes(
            piece_switch(this.board_state, this.selected, this.turn),
            pos,
        );
    }

    update(pos) {
        if (this.state === 2) return;

        if (this.is_pickable(pos)) {
            this.selected = pos;
            this.highlights = piece_switch(
                this.board_state,
                this.selected,
                this.turn,
            );
        } else if (this.selected !== null) {
            switch (this.state) {
                case 0:
                    if (!this.is_valid_destination(pos)) return;

                    this.board_state.update(this.selected, pos);
                    this.turn_update();
                    this.reset_selected();
                    this.board_state.pawns_state[this.board_state.at(pos)] =
                        false;

                    if (this.is_checkmate(this.board_state)) {
                        this.state = 2;
                        utils.print(
                            `CHECKMATE: ${this.turn === 0 ? "BLACK" : "WHITE"} WON!`,
                        );
                    } else if (this.is_king_checked(this.board_state)[0]) {
                        this.state = 1;
                        this.highlights = [
                            this.board_state.where(this.turn_king()),
                        ];
                    }
                    break;
                case 1:
                    if (!this.is_valid_destination(pos)) return;

                    const tmp_state = this.board_state.copy();
                    tmp_state.update(this.selected, pos);
                    if (this.is_king_checked(tmp_state)[0]) {
                        this.highlights = [
                            this.board_state.where(this.turn_king()),
                        ];
                    } else {
                        this.board_state = tmp_state;
                        this.state = 0;
                        this.reset_selected();
                        this.turn_update();
                    }
                    break;
            }
        }
    }
}

const GS = new GameState();
GS.render();

const renderboard = new Event("renderboard");
document.addEventListener("renderboard", () => GS.render(), false);

render.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rct = render.getBoundingClientRect();
    const pos = [
        utils.clamp(Math.floor((e.clientX - rct.x) / TW), 0, 7),
        utils.clamp(Math.floor((e.clientY - rct.y) / TH), 0, 7),
    ];

    GS.update(pos);
    document.dispatchEvent(renderboard);
});
