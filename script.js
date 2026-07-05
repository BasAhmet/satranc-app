const boardContainer = document.getElementById('board-container');

// Başlangıç dizilimi: Küçük harfler siyah, büyük harfler beyaz taşları temsil eder.
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

// Taşların içi dolu Unicode sembolleri 
// (Sadece dolu olanları seçtik, beyaz ve siyah renk ayrımını Tailwind CSS sınıflarıyla biz vereceğiz)
const pieceSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟'
};

function createBoard() {
    boardContainer.innerHTML = ''; 
    // select-none ekledik ki taşlara tıklarken yanlışlıkla metin seçimi (mavi vurgu) olmasın
    boardContainer.className = 'grid grid-cols-8 grid-rows-8 w-80 h-80 sm:w-96 sm:h-96 border-4 border-gray-800 mx-auto shadow-lg rounded-sm overflow-hidden select-none';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            const bgColor = isLight ? 'bg-gray-100' : 'bg-gray-500';
            
            // Taşların boyutunu text-4xl ve text-5xl ile ayarladık
            square.className = `w-full h-full flex items-center justify-center text-4xl sm:text-5xl cursor-pointer ${bgColor}`;
            square.dataset.row = row;
            square.dataset.col = col;

            // Matristen ilgili karedeki taşı çek
            const piece = initialBoard[row][col];
            
            // Eğer o karede bir taş varsa, ekrana bas
            if (piece) {
                const isWhite = piece === piece.toUpperCase();
                const symbol = pieceSymbols[piece.toLowerCase()];
                
                const pieceElement = document.createElement('span');
                pieceElement.textContent = symbol;
                
                // Beyaz taşlara beyaz renk ve hafif gölge, siyahlara koyu gri veriyoruz
                pieceElement.className = isWhite ? 'text-white drop-shadow-md' : 'text-gray-900';
                
                square.appendChild(pieceElement);
            }

            boardContainer.appendChild(square);
        }
    }
}

createBoard();
