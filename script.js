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
            // YENİ: Hamle yapılmadan önce kurallara uygun mu diye kontrol ediyoruz
            if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
                movePiece(row, col);
            } else {
                // Kurallara uymuyorsa seçimi hafifçe sarsabilir veya sadece kaldırabiliriz
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
    initialBoard[targetRow][targetCol] = pieceToMove;
    initialBoard[selectedSquare.row][selectedSquare.col] = '';
    
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

    // Genel kural: Aynı yere hamle yapılamaz (zaten yukarda eleniyor ama mantıkta dursun)
    if (startRow === targetRow && startCol === targetCol) return false;

    // Taş türlerine göre doğrulama fonksiyonlarını çağırıyoruz
    switch (type) {
        case 'p': return validatePawnMove(startRow, startCol, targetRow, targetCol, piece);
        case 'r': return validateRookMove(startRow, startCol, targetRow, targetCol);
        // Diğer taşlar şimdilik serbest (true dönüyor), kurallarını sırayla ekleyeceğiz
        case 'n':
        case 'b':
        case 'q':
        case 'k':
            return true; 
        default: return false;
    }
}

// 1. Piyon Hareketi Algoritması
function validatePawnMove(startRow, startCol, targetRow, targetCol, piece) {
    const isWhite = piece === piece.toUpperCase();
    const direction = isWhite ? -1 : 1; // Beyaz yukarı (-1 satır), Siyah aşağı (+1 satır) gider
    const startRowLimit = isWhite ? 6 : 1; // İlk hamle kontrolü için başlangıç satırları

    const rowDiff = targetRow - startRow;
    const colDiff = targetCol - startCol;
    const targetPiece = initialBoard[targetRow][targetCol];

    // Düz İlerleme (Aynı sütun, hedef kare boş olmalı)
    if (colDiff === 0 && targetPiece === '') {
        // 1 kare ileri
        if (rowDiff === direction) return true;
        // İlk hamlede 2 kare ileri (Yol üstündeki karenin de boş olması gerekir)
        if (startRow === startRowLimit && rowDiff === 2 * direction) {
            const intermediateRow = startRow + direction;
            if (initialBoard[intermediateRow][startCol] === '') return true;
        }
    }
    // Çapraz Taş Alma (1 kare çapraz ve hedefte rakip taş olmalı)
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece !== '') {
        return true; 
    }

    return false;
}

// 2. Kale Hareketi Algoritması
function validateRookMove(startRow, startCol, targetRow, targetCol) {
    // Kale ya aynı satırda ya aynı sütunda hareket etmelidir
    if (startRow !== targetRow && startCol !== targetCol) return false;

    const rowStep = targetRow === startRow ? 0 : (targetRow > startRow ? 1 : -1);
    const colStep = targetCol === startCol ? 0 : (targetCol > startCol ? 1 : -1);

    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    // Hedef kareye kadar olan yol üstündeki tüm karelerin boş olup olmadığını kontrol et
    while (currentRow !== targetRow || currentCol !== targetCol) {
        if (initialBoard[currentRow][currentCol] !== '') {
            return false; // Yol üstünde taş varsa kale zıplayamaz
        }
        currentRow += rowStep;
        currentCol += colStep;
    }

    return true;
}

createBoard();
