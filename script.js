const boardContainer = document.getElementById('board-container');
const turnIndicator = document.getElementById('turn-indicator');

const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const pieceSymbols = {
    'r': '♜\uFE0E', 'n': '♞\uFE0E', 'b': '♝\uFE0E', 'q': '♛\uFE0E', 'k': '♚\uFE0E', 'p': '♟\uFE0E',
    'R': '♖\uFE0E', 'N': '♘\uFE0E', 'B': '♗\uFE0E', 'Q': '♕\uFE0E', 'K': '♔\uFE0E', 'P': '♙\uFE0E'
};

let selectedSquare = null;
let currentPlayer = 'white';

// YENİ: Geçerken alma (En Passant) kuralı için son hamleyi hafızada tutuyoruz
let lastMove = null; 

function createBoard() {
    boardContainer.innerHTML = ''; 
    boardContainer.className = 'grid grid-cols-8 grid-rows-8 w-80 h-80 sm:w-96 sm:h-96 border-4 border-slate-800 mx-auto shadow-lg rounded-sm overflow-hidden select-none';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            const bgColor = isLight ? 'bg-slate-200' : 'bg-slate-500';
            
            square.className = `w-full h-full flex items-center justify-center text-4xl sm:text-5xl cursor-pointer ${bgColor}`;
            square.dataset.row = row;
            square.dataset.col = col;

            square.addEventListener('click', handleSquareClick);

            const piece = initialBoard[row][col];
            if (piece) {
                const symbol = pieceSymbols[piece];
                const pieceElement = document.createElement('span');
                pieceElement.textContent = symbol;
                pieceElement.style.fontFamily = "'Segoe UI Symbol', 'Arial Unicode MS', sans-serif";
                pieceElement.className = 'text-slate-900 drop-shadow-sm';
                square.appendChild(pieceElement);
            }

            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('bg-yellow-200/60');
            }

            boardContainer.appendChild(square);
        }
    }
    updateTurnIndicator();
}

function handleSquareClick(event) {
    const square = event.currentTarget;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const pieceAtSquare = initialBoard[row][col];

    if (!selectedSquare) {
        if (pieceAtSquare && isPieceCurrentPlayers(pieceAtSquare)) {
            selectSquare(square, row, col);
        }
    } else {
        if (row === selectedSquare.row && col === selectedSquare.col) {
            clearSelection();
        } else if (pieceAtSquare && isPieceCurrentPlayers(pieceAtSquare)) {
            selectSquare(square, row, col);
        } else {
            if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
                movePiece(row, col);
            } else {
                clearSelection();
            }
        }
    }
}

function isPieceCurrentPlayers(piece) {
    const isWhite = piece === piece.toUpperCase();
    return (currentPlayer === 'white' && isWhite) || (currentPlayer === 'black' && !isWhite);
}

function selectSquare(square, row, col) {
    clearSelection();
    selectedSquare = { row, col };
    square.classList.add('bg-yellow-200/60');
}

function clearSelection() {
    if (selectedSquare) {
        const allSquares = boardContainer.querySelectorAll('div');
        allSquares.forEach(sq => sq.classList.remove('bg-yellow-200/60'));
        selectedSquare = null;
    }
}

function movePiece(targetRow, targetCol) {
    const pieceToMove = initialBoard[selectedSquare.row][selectedSquare.col];
    
    // YENİ: Geçerken Alma (En Passant) durumunda yenilen piyonu tahtadan silme
    if (pieceToMove.toLowerCase() === 'p' && targetCol !== selectedSquare.col && initialBoard[targetRow][targetCol] === '') {
        // Eğer piyon çapraz gittiyse ama hedef kare boşsa, bu bir En Passant hamlesidir.
        // O halde yanımızdaki (hedef sütunundaki ve bizimle aynı satırdaki) rakip piyonu siliyoruz.
        initialBoard[selectedSquare.row][targetCol] = ''; 
    }

    // Taşı yeni yerine koy ve eski yerini boşalt
    initialBoard[targetRow][targetCol] = pieceToMove;
    initialBoard[selectedSquare.row][selectedSquare.col] = '';
    
    // YENİ: Hafızayı güncelle. Bu hamleyi "son hamle" olarak kaydet.
    lastMove = {
        piece: pieceToMove,
        startRow: selectedSquare.row,
        startCol: selectedSquare.col,
        targetRow: targetRow,
        targetCol: targetCol
    };

    clearSelection();
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    createBoard();
}

function updateTurnIndicator() {
    const turnText = currentPlayer === 'white' ? 'Beyaz' : 'Siyah';
    turnIndicator.innerHTML = `Sıra: <span class="text-slate-800">${turnText}</span>`;
}

// =========================================================================
// MANTIK MOTORU: HAMLE DOĞRULAMA ALGORİTMALARI
// =========================================================================

function isValidMove(startRow, startCol, targetRow, targetCol) {
    const piece = initialBoard[startRow][startCol];
    const type = piece.toLowerCase();

    if (startRow === targetRow && startCol === targetCol) return false;

    switch (type) {
        case 'p': return validatePawnMove(startRow, startCol, targetRow, targetCol, piece);
        case 'r': return validateRookMove(startRow, startCol, targetRow, targetCol);
        case 'b': return validateBishopMove(startRow, startCol, targetRow, targetCol); // YENİ: Fil kuralı eklendi
        case 'n':
        case 'q':
        case 'k':
            return true; 
        default: return false;
    }
}

// 1. Piyon Hareketi (En Passant Eklendi)
function validatePawnMove(startRow, startCol, targetRow, targetCol, piece) {
    const isWhite = piece === piece.toUpperCase();
    const direction = isWhite ? -1 : 1; 
    const startRowLimit = isWhite ? 6 : 1; 

    const rowDiff = targetRow - startRow;
    const colDiff = targetCol - startCol;
    const targetPiece = initialBoard[targetRow][targetCol];

    // Düz İlerleme
    if (colDiff === 0 && targetPiece === '') {
        if (rowDiff === direction) return true;
        if (startRow === startRowLimit && rowDiff === 2 * direction) {
            const intermediateRow = startRow + direction;
            if (initialBoard[intermediateRow][startCol] === '') return true;
        }
    }
    // Normal Çapraz Taş Alma
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece !== '') {
        return true; 
    }
    
    // YENİ: Geçerken Alma (En Passant) Mantığı
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece === '') {
        // Eğer son hamlede bir piyon 2 kare ilerlediyse ve bizim piyonumuzla yan yana geldiyse
        if (lastMove && lastMove.piece.toLowerCase() === 'p') {
            if (Math.abs(lastMove.startRow - lastMove.targetRow) === 2) {
                if (lastMove.targetRow === startRow && lastMove.targetCol === targetCol) {
                    return true;
                }
            }
        }
    }

    return false;
}

// 2. Kale Hareketi
function validateRookMove(startRow, startCol, targetRow, targetCol) {
    if (startRow !== targetRow && startCol !== targetCol) return false;

    const rowStep = targetRow === startRow ? 0 : (targetRow > startRow ? 1 : -1);
    const colStep = targetCol === startCol ? 0 : (targetCol > startCol ? 1 : -1);

    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    while (currentRow !== targetRow || currentCol !== targetCol) {
        if (initialBoard[currentRow][currentCol] !== '') return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

// 3. YENİ: Fil (Bishop) Hareketi
function validateBishopMove(startRow, startCol, targetRow, targetCol) {
    // Filin çapraz gitmesi için satır ve sütun değişim miktarı mutlak değerce eşit olmalıdır
    if (Math.abs(startRow - targetRow) !== Math.abs(startCol - targetCol)) return false;

    const rowStep = targetRow > startRow ? 1 : -1;
    const colStep = targetCol > startCol ? 1 : -1;

    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    // Hedef kareye kadar yol üstündeki tüm karelerin boş olup olmadığını kontrol et
    while (currentRow !== targetRow && currentCol !== targetCol) {
        if (initialBoard[currentRow][currentCol] !== '') {
            return false; // Yol üstünde taş varsa atlayamaz
        }
        currentRow += rowStep;
        currentCol += colStep;
    }

    return true;
}

createBoard();
