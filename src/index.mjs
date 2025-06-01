import utils, { auto, print, error } from "./utils.mjs";
import game, { Color, PieceKind, Board, Piece } from "./game.mjs";

const body_rect = document
    .getElementsByTagName("body")[0]
    .getBoundingClientRect();
const D = Math.min(body_rect.width, body_rect.height) - 100;
const [BW, BH] = [D, D];
const [TW, TH] = [Math.floor(BW / 8), Math.floor(BH / 8)];
const render = document.getElementById("render");
const pre = document.getElementsByTagName("pre")[0];
pre.innerText = "WHITE's Turn.";

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

// converts a given instance of class Piece to a string representation
// used for indexing the above IMAGE object
function piece2str(p) {
    let s = "";
    switch (p.kind) {
        case PieceKind.PAWN:
            s += "p";
            break;
        case PieceKind.QUEEN:
            s += "q";
            break;
        case PieceKind.KING:
            s += "k";
            break;
        case PieceKind.BISHOP:
            s += "b";
            break;
        case PieceKind.ROOK:
            s += "r";
            break;
        case PieceKind.KNIGHT:
            s += "n";
            break;
    }
    s += p.color === Color.BLACK ? "b" : "w";
    return s;
}

function board_render(board) {
    for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
            const p = board.at([x, y]);
            if (p === null) continue;

            const piece_img = utils.create_element("img", {
                src: `${ASSETS}/${IMAGES[piece2str(p)]}`,
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
        }
    }
}

// clear all the highlight dom nodes
// clear all the piece dom nodes
// re render the new piece position and move highlights
function game_render(board, hls) {
    utils.remove_elements_with_classname("piece");
    utils.remove_elements_with_classname("highlight");

    hls.forEach(([x, y]) => {
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

    board_render(board);
}

// === GAME STATE ===
let turn = Color.WHITE;
let highlights = [];
let selected = null;

function turnstr() {
    return turn === Color.BLACK ? "BLACK" : "WHITE";
}

function opponentstr() {
    return turn === Color.BLACK ? "WHITE" : "BLACK";
}

const initial_black_pawns = [];
const initial_white_pawns = [];
for (let i = 0; i < 8; i += 1) {
    initial_black_pawns.push(new Piece(Color.BLACK, PieceKind.PAWN));
    initial_white_pawns.push(new Piece(Color.WHITE, PieceKind.PAWN));
}

let board = new game.Board([
    [
        new Piece(Color.BLACK, PieceKind.ROOK),
        new Piece(Color.BLACK, PieceKind.KNIGHT),
        new Piece(Color.BLACK, PieceKind.BISHOP),
        new Piece(Color.BLACK, PieceKind.QUEEN),
        new Piece(Color.BLACK, PieceKind.KING),
        new Piece(Color.BLACK, PieceKind.BISHOP),
        new Piece(Color.BLACK, PieceKind.KNIGHT),
        new Piece(Color.BLACK, PieceKind.ROOK),
    ],
    initial_black_pawns,
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    initial_white_pawns,
    [
        new Piece(Color.WHITE, PieceKind.ROOK),
        new Piece(Color.WHITE, PieceKind.KNIGHT),
        new Piece(Color.WHITE, PieceKind.BISHOP),
        new Piece(Color.WHITE, PieceKind.QUEEN),
        new Piece(Color.WHITE, PieceKind.KING),
        new Piece(Color.WHITE, PieceKind.BISHOP),
        new Piece(Color.WHITE, PieceKind.KNIGHT),
        new Piece(Color.WHITE, PieceKind.ROOK),
    ],
]);

const render_board = new Event("render_board");
document.addEventListener("render_board", () => {
    game_render(board, highlights);
});

document.dispatchEvent(render_board);

function update_game(pos) {
    let state = null;

    pre.innerText = `${turnstr()}'s Turn.`;
    // if the board is in check
    if (game.is_in_check(board, turn)) {
        const tmp_board = board.move(selected, pos);
        if (game.is_in_check(tmp_board, turn)) {
            highlights = board.where(PieceKind.KING, turn);
            pre.innerText += `, ${turnstr()}'s KING is in CHECK!`;
            return;
        }
    }

    // if clicked position is a legal move, move the piece
    // and update the turn
    const legal_moves = game.piece_switch(board, selected);
    if (utils.includes(legal_moves, pos)) {
        board = board.move(selected, pos);
        turn = turn === Color.WHITE ? Color.BLACK : Color.WHITE;
    }

    if (game.is_checkmate(board, turn)) {
        state = "OVER";
        pre.innerText = `CHECKMATE! ${opponentstr()} WON!`;
    }

    selected = null;
    highlights = [];
    return state;
}

function onpointerdown(e) {
    e.preventDefault();
    const rect = render.getBoundingClientRect();
    const pos = [
        Math.floor((e.clientX - rect.x) / TW),
        Math.floor((e.clientY - rect.y) / TH),
    ];

    const p = board.at(pos);
    // check if piece can be selected
    if (p !== null && p.color === turn) {
        selected = pos;
        highlights = game.piece_switch(board, selected);

        // check if we already have a selected piece
    } else if (selected) {
        const status = update_game(pos);
        if (status === "OVER") {
            render.removeEventListener("pointerdown", onpointerdown);
        }
    }

    document.dispatchEvent(render_board);
}
render.addEventListener("pointerdown", onpointerdown);
