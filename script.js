const boardContainer = document.getElementById('board-container');
const turnIndicator = document.getElementById('turn-indicator'); // index.html'e eklediğimiz gösterge

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

// --- YENİ: Oyun Durumu ve Seçim Değişkenleri ---
let selectedSquare = null; // Hangi karenin (row, col) seçili olduğunu tutar
let currentPlayer = 'white'; // Oyuna her zaman Beyaz başlar

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

            // YENİ: Her kareye tıklama olayı ekle
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

            boardContainer.appendChild(square);
        }
    }
    
    // YENİ: Tahtayı her çizdiğimizde sıra göstergesini güncelle
    updateTurnIndicator();
}

// --- YENİ: Tıklama Yönetimi Fonksiyonları ---

function handleSquareClick(event) {
    const square = event.currentTarget;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const pieceAtSquare = initialBoard[row][col];

    // Durum 1: Hiçbir taş seçili değilse
    if (!selectedSquare) {
        // Eğer tıkladığımız karede bir taş varsa VE bu taş şu anki oyuncunun taşıysa
        if (pieceAtSquare && isPieceCurrentPlayers(pieceAtSquare)) {
            selectSquare(square, row, col);
        }
    } 
    // Durum 2: Bir taş zaten seçili durumdaysa
    else {
        const selectedPiece = initialBoard[selectedSquare.row][selectedSquare.col];

        // Durum 2a: Tıkladığımız kare, seçili karenin aynısıysa, seçimi kaldır.
        if (row === selectedSquare.row && col === selectedSquare.col) {
            clearSelection();
        } 
        // Durum 2b: Tıkladığımız karede YİNE mevcut oyuncunun bir taşı varsa, seçimi O taşa kaydır.
        else if (pieceAtSquare && isPieceCurrentPlayers(pieceAtSquare)) {
            clearSelection();
            selectSquare(square, row, col);
        }
        // Durum 2c: Tıkladığımız kare boş veya rakibin taşıysa, taşı ORAYA TAŞI (Serbest Taşıma)
        else {
            movePiece(row, col);
        }
    }
}

// Yardımcı Fonksiyon: Taşın mevcut oyuncuya ait olup olmadığını kontrol eder
function isPieceCurrentPlayers(piece) {
    const isWhite = piece === piece.toUpperCase();
    return (currentPlayer === 'white' && isWhite) || (currentPlayer === 'black' && !isWhite);
}

// Yardımcı Fonksiyon: Kareyi seçili hale getirir (görsel ve mantıksal)
function selectSquare(square, row, col) {
    clearSelection(); // Önceki seçimleri temizle
    selectedSquare = { row, col };
    square.classList.add('bg-yellow-200/60'); // Tailwind ile sarımsı vurgu
}

// Yardımcı Fonksiyon: Tüm seçim görselini ve mantığını temizler
function clearSelection() {
    if (selectedSquare) {
        const allSquares = boardContainer.querySelectorAll('div');
        allSquares.forEach(sq => sq.classList.remove('bg-yellow-200/60'));
        selectedSquare = null;
    }
}

// Yardımcı Fonksiyon: Seçili taşı mantıksal olarak taşır, tahtayı yeniden çizer ve sırayı değiştirir
function movePiece(targetRow, targetCol) {
    const pieceToMove = initialBoard[selectedSquare.row][selectedSquare.col];

    // Matriste (mantık modelinde) taşı taşı ve eski kareyi boşalt
    initialBoard[targetRow][targetCol] = pieceToMove;
    initialBoard[selectedSquare.row][selectedSquare.col] = '';
    
    clearSelection(); // Seçimi kaldır
    createBoard(); // Tahtayı görsel olarak yeniden çiz (bu işlem taşı yeni yerine yerleştirecek)
    
    // Sırayı değiştir (Basit turn management)
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateTurnIndicator(); // Göstergeyi güncelle
}

// Yardımcı Fonksiyon: index.html'deki sıra metnini günceller
function updateTurnIndicator() {
    const turnText = currentPlayer === 'white' ? 'Beyaz' : 'Siyah';
    turnIndicator.innerHTML = `Sıra: <span class="text-slate-800">${turnText}</span>`;
}

createBoard();
