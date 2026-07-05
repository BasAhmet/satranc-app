const boardContainer = document.getElementById('board-container');
const turnIndicator = document.getElementById('turn-indicator');
const moveHistoryContainer = document.getElementById('move-history');
let moveNumber = 1;
let currentMoveRow = null; // Hamleleri 1. [Beyaz] [Siyah] şeklinde yan yana yazmak için

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
let lastMove = null; 

function createBoard() {
    boardContainer.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            
            square.classList.add('relative');            
            // Açık kare mi koyu kare mi olduğunu belirliyoruz (bunu zaten yapıyorsundur)
            const isLightSquare = (row + col) % 2 === 0;
            
            // Kendi mevcut class atamalarını buraya koy (örn: bg-slate-300 vb.)
            // ... (KENDİ KODUN) ...
            
            // ÖNEMLİ: İçindeki yazıları köşelere yaslayabilmek için karenin 'relative' olması şart!
            square.classList.add('relative'); 
            
            // ... (Varsa taş ekleme kodların) ...

            // ==========================================
            // YENİ: NOTASYON KOORDİNATLARINI YAZDIRMA
            // ==========================================
            
            // Sütun Harfleri (a-h) -> Sadece en alt satırda (row === 7)
            if (row === 7) {
                const fileLabel = document.createElement('span');
                fileLabel.textContent = String.fromCharCode(97 + col);
                const textColor = (row + col) % 2 === 0 ? 'text-slate-600' : 'text-slate-300';
                fileLabel.className = `absolute bottom-0.5 left-1 text-[10px] font-bold select-none ${textColor}`;
                square.appendChild(fileLabel);
            }
            
            // Satır Sayıları (1-8)
            if (col === 7) {
                const rankLabel = document.createElement('span');
                rankLabel.textContent = 8 - row;
                const textColor = (row + col) % 2 === 0 ? 'text-slate-600' : 'text-slate-300';
                rankLabel.className = `absolute top-0.5 right-1 text-[10px] font-bold select-none ${textColor}`;
                square.appendChild(rankLabel);
            }

            // ... (Tıklama olayları vs.) ...

            boardContainer.appendChild(square);
        }
    }
}
// ... Diğer kodların üst kısımları aynı kalıyor ...
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
            if (pieceAtSquare !== '' && isPieceCurrentPlayers(pieceAtSquare)) return;

            // 1. Taşın kendi fiziksel kuralına uyuyor mu?
            if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
                
                // 2. SİMÜLASYON: Bu hamle şahımızı tehlikeye atıyor mu?
                const originalTargetPiece = initialBoard[row][col];
                const pieceToMove = initialBoard[selectedSquare.row][selectedSquare.col];
                
                // Geçici olarak hamleyi yap
                initialBoard[row][col] = pieceToMove;
                initialBoard[selectedSquare.row][selectedSquare.col] = '';
                
                // Şah güvende mi kontrol et
                const isSafe = !isKingInCheck(currentPlayer);
                
                // Tahtayı geri al (Simülasyon bitti)
                initialBoard[selectedSquare.row][selectedSquare.col] = pieceToMove;
                initialBoard[row][col] = originalTargetPiece;

                // Eğer şah güvendeyse gerçek hamleyi yap, değilse iptal et
                if (isSafe) {
                    movePiece(row, col);
                } else {
                    // Şah tehlikede olduğu için bu hamleye izin verilmiyor
                    clearSelection();
                }
            } else {
                clearSelection();
            }
        }
    }
}
// ... selectSquare, clearSelection, movePiece vb. buralarda aynı kalıyor ...
// =========================================================================
// YENİ: ŞAH KONTROL MEKANİZMASI
// =========================================================================
// Bir taşın belirli bir renge ait olup olmadığını kontrol eder
function isPieceColor(piece, color) {
    const isWhite = piece === piece.toUpperCase();
    return (color === 'white' && isWhite) || (color === 'black' && !isWhite);
}
// Belirtilen rengin şahı tehdit altında mı diye tüm tahtayı tarar
function isKingInCheck(color) {
    let kingRow, kingCol;
    const kingSymbol = color === 'white' ? 'K' : 'k';    
    // 1. Kendi şahımızın koordinatlarını bul
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (initialBoard[r][c] === kingSymbol) {
                kingRow = r;
                kingCol = c;
                break;
            }
        }
    }
    // 2. Bütün tahtayı dolaş ve rakip taşların şahımıza hamle yapıp yapamadığına bak
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = initialBoard[r][c];
            if (piece !== '' && !isPieceColor(piece, color)) {
                // Rakip taşın bizim şahımızın karesine geçerli bir hamlesi var mı?
                if (isValidMove(r, c, kingRow, kingCol)) {
                    return true; // Şah çekilmiş!
                }
            }
        }
    }
    return false; // Şah güvende
}
// =========================================================================
// MANTIK MOTORU: HAMLE DOĞRULAMA ALGORİTMALARI
// =========================================================================
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
    
    // Rok (Castling) Hamlesi gerçekleştiyse Kaleyi de taşı
    if (pieceToMove.toLowerCase() === 'k' && Math.abs(targetCol - selectedSquare.col) === 2) {
        const isKingside = targetCol > selectedSquare.col;
        const rookCol = isKingside ? 7 : 0;
        const newRookCol = isKingside ? 5 : 3;
        
        initialBoard[targetRow][newRookCol] = initialBoard[targetRow][rookCol];
        initialBoard[targetRow][rookCol] = '';
    }

    // Piyon En Passant
    if (pieceToMove.toLowerCase() === 'p' && targetCol !== selectedSquare.col && initialBoard[targetRow][targetCol] === '') {
        initialBoard[selectedSquare.row][targetCol] = ''; 
    }

    // Taşı yeni yerine koy ve eski yerini boşalt
    initialBoard[targetRow][targetCol] = pieceToMove;
    initialBoard[selectedSquare.row][selectedSquare.col] = '';
    
    // ==========================================
    // YENİ: Piyon Terfisi (Promotion) Mantığı
    // ==========================================
    if (pieceToMove === 'P' && targetRow === 0) {
        // Beyaz piyon en üst satıra ulaştı, beyaz vezir (Q) yap
        initialBoard[targetRow][targetCol] = 'Q';
    } else if (pieceToMove === 'p' && targetRow === 7) {
        // Siyah piyon en alt satıra ulaştı, siyah vezir (q) yap
        initialBoard[targetRow][targetCol] = 'q';
    }

    // Son hamleyi hafızaya kaydet
    lastMove = { 
        piece: pieceToMove, 
        startRow: selectedSquare.row, 
        startCol: selectedSquare.col, 
        targetRow: targetRow, 
        targetCol: targetCol 
    };
    // YENİ: Hamleyi panele kaydet (Sıra karşıya geçmeden HEMEN ÖNCE)
    recordMove(pieceToMove, targetRow, targetCol);

    clearSelection();
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    createBoard();
    // YENİ: Hamle yapılıp sıra karşıya geçtikten hemen sonra oyun sonu kontrolü yap
    // setTimeout kullanıyoruz ki tahta ekranda çizildikten (render) sonra uyarı çıksın
    setTimeout(() => {
        if (!hasAnyValidMove(currentPlayer)) {
            if (isKingInCheck(currentPlayer)) {
                const winner = currentPlayer === 'white' ? 'Siyah' : 'Beyaz';
                alert(`ŞAH MAT! ${winner} kazandı!`);
            } else {
                alert("PAT! Geçerli hamle yok, oyun berabere.");
            }
        } else if (isKingInCheck(currentPlayer)) {
            // İsteğe bağlı: Oyun bitmedi ama şah çekildi uyarısı
            console.log("Şah çekildi!");
        }
    }, 10);
}
// Şah hareketi içine Rok mantığını ekliyoruz
function validateKingMove(startRow, startCol, targetRow, targetCol) {
    const rowDiff = Math.abs(startRow - targetRow);
    const colDiff = Math.abs(startCol - targetCol);

    // Normal hareket
    if (rowDiff <= 1 && colDiff <= 1) return true;

    // Rok hamlesi (2 kare ilerleme)
    if (rowDiff === 0 && colDiff === 2) {
        const isKingside = targetCol > startCol;
        const rookCol = isKingside ? 7 : 0;
        
        // Şah ve kale hareket etmemiş olmalı (Basit kontrol)
        // Gerçek bir motorda "hasMoved" flag'i tutmalısın
        if (initialBoard[startRow][rookCol].toLowerCase() === 'r') {
            // Aradaki kareler boş mu?
            const step = isKingside ? 1 : -1;
            let checkCol = startCol + step;
            while (checkCol !== rookCol) {
                if (initialBoard[startRow][checkCol] !== '') return false;
                checkCol += step;
            }
            return true;
        }
    }
    return false;
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

    // YENİ: Tüm taşların fonksiyonları aktif edildi
    switch (type) {
        case 'p': return validatePawnMove(startRow, startCol, targetRow, targetCol, piece);
        case 'r': return validateRookMove(startRow, startCol, targetRow, targetCol);
        case 'b': return validateBishopMove(startRow, startCol, targetRow, targetCol);
        case 'n': return validateKnightMove(startRow, startCol, targetRow, targetCol);
        case 'q': return validateQueenMove(startRow, startCol, targetRow, targetCol);
        case 'k': return validateKingMove(startRow, startCol, targetRow, targetCol);
        default: return false;
    }
}
function validatePawnMove(startRow, startCol, targetRow, targetCol, piece) {
    const isWhite = piece === piece.toUpperCase();
    const direction = isWhite ? -1 : 1; 
    const startRowLimit = isWhite ? 6 : 1; 

    const rowDiff = targetRow - startRow;
    const colDiff = targetCol - startCol;
    const targetPiece = initialBoard[targetRow][targetCol];

    if (colDiff === 0 && targetPiece === '') {
        if (rowDiff === direction) return true;
        if (startRow === startRowLimit && rowDiff === 2 * direction) {
            const intermediateRow = startRow + direction;
            if (initialBoard[intermediateRow][startCol] === '') return true;
        }
    }
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece !== '') return true; 
    
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece === '') {
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
function validateBishopMove(startRow, startCol, targetRow, targetCol) {
    if (Math.abs(startRow - targetRow) !== Math.abs(startCol - targetCol)) return false;

    const rowStep = targetRow > startRow ? 1 : -1;
    const colStep = targetCol > startCol ? 1 : -1;

    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    while (currentRow !== targetRow && currentCol !== targetCol) {
        if (initialBoard[currentRow][currentCol] !== '') return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}
// 4. YENİ: At Hareketi
function validateKnightMove(startRow, startCol, targetRow, targetCol) {
    const rowDiff = Math.abs(startRow - targetRow);
    const colDiff = Math.abs(startCol - targetCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}
// 5. YENİ: Vezir Hareketi
function validateQueenMove(startRow, startCol, targetRow, targetCol) {
    // Vezir = Kale + Fil kombinasyonudur
    return validateRookMove(startRow, startCol, targetRow, targetCol) || 
           validateBishopMove(startRow, startCol, targetRow, targetCol);
}
// =========================================================================
// YENİ: OYUN SONU KONTROLÜ (MAT VE PAT)
// =========================================================================
function hasAnyValidMove(color) {
    // 1. Tahtadaki tüm kareleri gez
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            const piece = initialBoard[startRow][startCol];
            
            // 2. Eğer bu karede kendi taşımız varsa...
            if (piece !== '' && isPieceColor(piece, color)) {
                
                // 3. Bu taşın gidebileceği tüm olası hedef kareleri dene
                for (let targetRow = 0; targetRow < 8; targetRow++) {
                    for (let targetCol = 0; targetCol < 8; targetCol++) {
                        
                        // YENİ DÜZELTME: Hedef karede kendi taşımız varsa bu hayali hamleyi direkt atla!
                        const targetPiece = initialBoard[targetRow][targetCol];
                        if (targetPiece !== '' && isPieceColor(targetPiece, color)) {
                            continue; 
                        }
                        
                        // 4. Eğer bu hedefe gitmek fiziksel olarak kurallara uygunsa
                        if (isValidMove(startRow, startCol, targetRow, targetCol)) {
                            
                            // 5. Simülasyonu yap: Bu hamle şahı kurtarıyor mu?
                            const originalTargetPiece = initialBoard[targetRow][targetCol];
                            initialBoard[targetRow][targetCol] = piece;
                            initialBoard[startRow][startCol] = '';

                            const isSafe = !isKingInCheck(color);

                            // Simülasyonu geri al
                            initialBoard[startRow][startCol] = piece;
                            initialBoard[targetRow][targetCol] = originalTargetPiece;

                            // Eğer şahı güvende tutan tek bir hamle bile bulduysak oyun devam eder
                            if (isSafe) {
                                return true; 
                            }
                        }
                    }
                }
            }
        }
    }
    // Tüm taşların tüm ihtimallerini denedik, kurtuluş yok!
    return false; 
}
// =========================================================================
// YENİ: HAMLE GEÇMİŞİ VE NOTASYON MOTORU
// =========================================================================

function getAlgebraicNotation(row, col) {
    const file = String.fromCharCode(97 + col); // 0 -> 'a', 1 -> 'b' vb.
    const rank = 8 - row; // 0 -> 8, 7 -> 1
    return file + rank;
}

function recordMove(piece, targetRow, targetCol) {
    const notation = getAlgebraicNotation(targetRow, targetCol);
    const pieceSymbol = piece.toLowerCase() === 'p' ? '' : pieceSymbols[piece]; 
    const moveText = pieceSymbol + notation;

    if (currentPlayer === 'white') {
        // Beyazın hamlesi
        currentMoveRow = document.createElement('div');
        // Mobilde yan yana şeritler (border-r, shrink-0), masaüstünde alt alta liste (border-b)
        currentMoveRow.className = 'flex shrink-0 w-32 md:w-auto md:justify-between border-r md:border-r-0 md:border-b border-slate-200 pr-2 md:pr-0 md:pb-1 md:mb-1 mr-2 md:mr-0 items-center';
        
        const moveNumSpan = document.createElement('span');
        moveNumSpan.className = 'text-slate-400 w-6 font-bold text-xs';
        moveNumSpan.textContent = moveNumber + '.';

        const whiteMoveSpan = document.createElement('span');
        whiteMoveSpan.className = 'w-10 font-medium text-left';
        whiteMoveSpan.textContent = moveText;

        // Siyahın hamlesi gelene kadar genişliği koruması için şeffaf bir yer tutucu
        const blackMovePlaceholder = document.createElement('span');
        blackMovePlaceholder.className = 'w-10 text-right black-move-placeholder text-transparent';
        blackMovePlaceholder.textContent = '...'; 

        currentMoveRow.appendChild(moveNumSpan);
        currentMoveRow.appendChild(whiteMoveSpan);
        currentMoveRow.appendChild(blackMovePlaceholder);
        
        moveHistoryContainer.appendChild(currentMoveRow);
        
    } else {
        // Siyahın hamlesi: Şeffaf yer tutucuyu görünür yap ve yazıyı güncelle
        if (currentMoveRow) {
            const blackPlaceholder = currentMoveRow.querySelector('.black-move-placeholder');
            if (blackPlaceholder) {
                blackPlaceholder.classList.remove('black-move-placeholder', 'text-transparent');
                blackPlaceholder.classList.add('font-medium', 'text-slate-800');
                blackPlaceholder.textContent = moveText;
            }
        }
        moveNumber++; 
    }
    
    // YENİ: Masaüstü için aşağıya, mobil için sağa doğru otomatik kaydır
    moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
    moveHistoryContainer.scrollLeft = moveHistoryContainer.scrollWidth;
}
createBoard();
