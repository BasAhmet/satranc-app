const boardContainer = document.getElementById('board-container');

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

// ÇÖZÜM: Beyaz taşlar (Büyük harf) için içi boş, Siyah taşlar için içi dolu semboller.
const pieceSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

function createBoard() {
    boardContainer.innerHTML = ''; 
    boardContainer.className = 'grid grid-cols-8 grid-rows-8 w-80 h-80 sm:w-96 sm:h-96 border-4 border-slate-800 mx-auto shadow-lg rounded-sm overflow-hidden select-none';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            
            // Tahta renklerini daha yumuşak ve kontrastlı slate tonlarına çektik
            const bgColor = isLight ? 'bg-slate-200' : 'bg-slate-500';
            
            square.className = `w-full h-full flex items-center justify-center text-4xl sm:text-5xl cursor-pointer ${bgColor}`;
            square.dataset.row = row;
            square.dataset.col = col;

            const piece = initialBoard[row][col];
            
            if (piece) {
                // Taşı doğrudan sözlükten çekiyoruz
                const symbol = pieceSymbols[piece];
                
                const pieceElement = document.createElement('span');
                pieceElement.textContent = symbol;
                
                // Artık karakterin kendi çizgileri rengi belirlediği için,
                // tüm taşlara koyu gri bir renk ve hafif gölge veriyoruz.
                pieceElement.className = 'text-slate-900 drop-shadow-sm';
                
                square.appendChild(pieceElement);
            }

            boardContainer.appendChild(square);
        }
    }
}

createBoard();
