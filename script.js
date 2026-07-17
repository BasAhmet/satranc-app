import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIOiygyqnwcGyxnUn6tGVA4tT2_QjknIA",
    authDomain: "ahba-satranc.firebaseapp.com",
    projectId: "ahba-satranc",
    storageBucket: "ahba-satranc.firebasestorage.app",
    messagingSenderId: "1002253988356",
    appId: "1:1002253988356:web:66063dafa6926c5e033b51",
    measurementId: "G-F7B3ZJCH5W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const boardContainer = document.getElementById('board-container');
const turnIndicator = document.getElementById('turn-indicator');
const moveHistoryContainer = document.getElementById('move-history');
const btnRestart = document.getElementById('btn-restart');
const roomCodeDisplay = document.getElementById('room-code-display');
const roomCodeText = document.getElementById('room-code-text');
const botDifficultySelect = document.getElementById('bot-difficulty');
let botLevel = 1; // Seçilen bot seviyesini hafızada tutacak değişken

let moveNumber = 1;
let currentMoveRow = null;

let initialBoard = [
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
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟', 
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'  
};

let selectedSquare = null;
let currentPlayer = 'white';
let lastMove = null;
let moveHistoryList = []; // Tüm hamle notasyonlarını tutacak listemiz
let myColor = null;       // Oyuncunun kendi rengi ('white' veya 'black')
let currentRoomId = null; // Oynanan odanın kodu
let isLocalPlay = false;  // YENİ: Aynı cihazda oynama modu kontrolü
let rotateBlackPieces = false; // YENİ: Siyah taşları döndürme tercihi
let isBotPlay = false; // YENİ: Bota karşı oynama modu kontrolü
// YENİ: Rok haklarını (Hafıza) tutan değişken
let castlingRights = { wK: true, wQ: true, bK: true, bQ: true };

if (btnRestart) {
    btnRestart.addEventListener('click', async () => {
        castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        // Eğer bir odaya henüz girilmediyse buton çalışmasın
        if (!currentRoomId && !isLocalPlay && !isBotPlay) return; 

        // Yanlışlıkla basmalara karşı küçük bir onay alalım
        const onay = confirm("Oyunu sıfırlayıp yeni bir maça başlamak istediğinize emin misiniz?");
        if (!onay) return;

        // Tahtanın ilk (başlangıç) halini yepyeni bir dizi olarak oluşturuyoruz
        const startingBoard = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        if (isLocalPlay || isBotPlay) {
            // Yerel oyunda direkt lokal değişkenleri sıfırla
            initialBoard = startingBoard;
            currentPlayer = 'white';
            moveHistoryList = [];
            lastMove = null; // YENİ: Yerel maç rövanşında sıfırla
            createBoard();
            updateTurnIndicator();
            renderMoveHistory();
            console.log("Yerel/Bot maçı başarıyla sıfırlandı!");
        } else {
            // Online oyunda Firebase'i sıfırla
            const gameRef = doc(db, "games", currentRoomId);
            await setDoc(gameRef, {
                board: JSON.stringify(startingBoard),
                turn: 'white',
                moveCount: 1,
                history: [],
                lastMove: null // YENİ: Online maç rövanşında sıfırla
            }, { merge: true }); 
        }
    });
}

// =========================================================================
// 0. LOBİ VE ODA YÖNETİMİ
// =========================================================================
const lobbyScreen = document.getElementById('lobby-screen');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const inputRoomCode = document.getElementById('input-room-code');
const btnLocalPlay = document.getElementById('btn-local-play');
const btnBotPlay = document.getElementById('btn-bot-play');

// BOTA KARŞI MAÇ BAŞLATMA BUTTONU
if (btnBotPlay) {
    btnBotPlay.addEventListener('click', () => {
        castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        isBotPlay = true;
        isLocalPlay = false; // Yerel oyun değil
        myColor = 'white';   // Oyuncu her zaman Beyaz olsun

        // YENİ: Açılır menüden seçilen seviyeyi integer (tam sayı) olarak alıyoruz
        botLevel = parseInt(botDifficultySelect.value) || 2;
        
        lobbyScreen.classList.add('hidden');
        
        if (roomCodeDisplay && roomCodeText) {
            roomCodeText.textContent = `🤖 Bot Maçı (Seviye ${botLevel})`;
            roomCodeDisplay.classList.remove('hidden');
        }
        
        currentPlayer = 'white';
        moveHistoryList = [];
        lastMove = null;
        updateTurnIndicator();
        createBoard();
    });
}

// ODA KURMA (BEYAZ OYUNCU)
btnCreateRoom.addEventListener('click', async () => {
    currentRoomId = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 haneli rastgele kod
    myColor = 'white';
    // ... lobbyScreen.classList.add('hidden'); satırının hemen altına ekle:
    if (roomCodeDisplay && roomCodeText) {
        roomCodeText.textContent = currentRoomId;
        roomCodeDisplay.classList.remove('hidden');
    }
    
    const gameRef = doc(db, "games", currentRoomId);
    await setDoc(gameRef, {
        board: JSON.stringify(initialBoard),
        turn: 'white',
        moveCount: 1,
        playerBlackJoined: false // Siyahın katılıp katılmadığını takip için
    });
    
    lobbyScreen.classList.add('hidden');
    alert(`ODA KODUNUZ: ${currentRoomId}\n\nArkadaşınıza bu kodu gönderin ve Siyah olarak katılmasını bekleyin.`);
    listenGame(currentRoomId);
});

// ODAYA KATILMA (SİYAH OYUNCU)
btnJoinRoom.addEventListener('click', async () => {
    const code = inputRoomCode.value.trim().toUpperCase();
    if (!code) return alert("Lütfen bir oda kodu girin!");
    // ... lobbyScreen.classList.add('hidden'); satırının hemen altına ekle:
    if (roomCodeDisplay && roomCodeText) {
        roomCodeText.textContent = code;
        roomCodeDisplay.classList.remove('hidden');
    }
    
    const gameRef = doc(db, "games", code);
    const gameSnap = await getDoc(gameRef);
    
    if (gameSnap.exists()) {
        const data = gameSnap.data();
        if (!data.playerBlackJoined) {
            myColor = 'black';
            currentRoomId = code;
            
            // Firebase'de odayı 'Siyah da katıldı' olarak güncelle
            await setDoc(gameRef, { playerBlackJoined: true }, { merge: true });
            
            lobbyScreen.classList.add('hidden');
            alert(`Odaya Siyah olarak katıldınız! İlk hamle Beyazın.`);
            listenGame(currentRoomId);
        } else {
            alert("Bu oda zaten dolu, iki kişi oynuyor!");
        }
    } else {
        alert("Böyle bir oda kodu bulunamadı!");
    }
});

// YEREL MAÇ BAŞLATMA BUTTONU
if (btnLocalPlay) {
    btnLocalPlay.addEventListener('click', () => {
        castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        isLocalPlay = true;
        myColor = 'local'; 
        
        // YENİ: Kullanıcıya siyah taşların dönüp dönmeyeceğini soruyoruz
        rotateBlackPieces = confirm("Masada karşılıklı oynayacaksanız, karşı tarafın rahat görmesi için Siyah taşlar ters (rakibinize doğru) dönsün mü?");
        
        lobbyScreen.classList.add('hidden'); // Lobiyi gizle
        
        // Üst kısımdaki Oda Kodu alanına "Yerel Maç" yazalım
        if (roomCodeDisplay && roomCodeText) {
            roomCodeText.textContent = "Yerel Maç 📱";
            roomCodeDisplay.classList.remove('hidden');
        }
        
        // Oyunu yerel olarak sıfırla ve başlat
        currentPlayer = 'white';
        moveHistoryList = [];
        lastMove = null; // YENİ: Yerel maça başlarken son hamleyi sıfırla
        updateTurnIndicator();
        createBoard();
    });
}

// =========================================================================
// 1. TAHTA OLUŞTURMA VE ÇİZİM
// =========================================================================
function createBoard() {
    if (!boardContainer) return;
    boardContainer.innerHTML = '';

    // Oyuncunun rolü 'black' ise tahtayı Siyahın bakış açısıyla çizeceğiz
    let isBlackView = false;
    if (typeof myColor !== 'undefined') {
        isBlackView = (myColor === 'black');
    }

    // Döngü değişkenlerini 'r' ve 'c' yapıyoruz ki çakışma olmasın
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Siyah oyuncu bakış açısındaysa satır ve sütun sırasını tersten okuyoruz
            const row = isBlackView ? 7 - r : r;
            const col = isBlackView ? 7 - c : c;
            
            const square = document.createElement('div');
            const isLightSquare = (row + col) % 2 === 0;
            let bgColor = isLightSquare ? 'bg-slate-200' : 'bg-slate-500';

            // YENİ: Eğer bu kare, son hamlenin başlangıç veya bitiş karesiyse rengini sarımsı/yeşilimsi yap
            if (lastMove && ((row === lastMove.startRow && col === lastMove.startCol) || (row === lastMove.targetRow && col === lastMove.targetCol))) {
                // Açık kareler için pastel sarı, koyu kareler için biraz daha koyu bir sarı/turuncu tonu
                bgColor = isLightSquare ? 'bg-yellow-100' : 'bg-yellow-300'; 
            }

            square.className = `w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex justify-center items-center relative ${bgColor}`;
            square.dataset.row = row;
            square.dataset.col = col;

            square.addEventListener('click', handleSquareClick);
            
            const piece = initialBoard[row][col];
            if (piece !== '') {
                const pieceElement = document.createElement('span');
                pieceElement.textContent = pieceSymbols[piece];
                // YENİ: Taş siyah ise ve döndürme seçeneği evet ise ters çevirme sınıflarını ekle
                let transformClass = '';
                // Siyah taşlar küçük harfle yazıldığı için (piece === piece.toLowerCase()) ile siyah mı diye kontrol ediyoruz
                if (isLocalPlay && rotateBlackPieces && piece === piece.toLowerCase()) {
                    // rotate-180 ile 180 derece döndürüyoruz, inline-block ile dönmenin düzgün çalışmasını sağlıyoruz
                    transformClass = ' inline-block rotate-180'; 
                }
                // DÜZELTİLMİŞ HALİ (En sona ${transformClass} eklendi ve ters tırnak kullanıldı):
                pieceElement.className = `text-4xl sm:text-5xl md:text-6xl text-slate-800 select-none drop-shadow-sm pointer-events-none${transformClass}`;;
                pieceElement.style.fontFamily = "'Arial Unicode MS', 'Segoe UI Symbol', sans-serif";
                square.appendChild(pieceElement);
            }

            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.remove(bgColor);
                square.classList.add('bg-yellow-400'); 
            }

            // Sütun Harfleri (a-h) -> Görsel olarak en alt sıraya eklenir
            if (r === 7) {
                const fileLabel = document.createElement('span');
                fileLabel.textContent = String.fromCharCode(97 + col); 
                const textColor = isLightSquare ? 'text-slate-500' : 'text-slate-200';
                fileLabel.className = `absolute bottom-0 left-1 text-[10px] font-bold select-none ${textColor}`;
                square.appendChild(fileLabel);
            }

            // Satır Sayıları (1-8) -> Görsel olarak en sağ sütuna eklenir
            if (c === 7) {
                const rankLabel = document.createElement('span');
                rankLabel.textContent = 8 - row; 
                const textColor = isLightSquare ? 'text-slate-500' : 'text-slate-200';
                rankLabel.className = `absolute top-0 right-1 text-[10px] font-bold select-none ${textColor}`;
                square.appendChild(rankLabel);
            }

            boardContainer.appendChild(square);
        }
    }
}

// =========================================================================
// PİYON TERFİSİ (PROMOTION) YÖNETİMİ
// =========================================================================
function showPromotionModal(color, targetRow, targetCol) {
    const modal = document.getElementById('promotion-modal');
    const optionsContainer = document.getElementById('promotion-options');
    optionsContainer.innerHTML = ''; 

    const pieces = color === 'white' 
        ? { 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' } 
        : { 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞' };

    for (const [key, symbol] of Object.entries(pieces)) {
        const btn = document.createElement('button');
        btn.className = 'w-16 h-16 text-5xl bg-slate-50 hover:bg-slate-200 rounded border-2 border-slate-300 flex items-center justify-center cursor-pointer transition-colors pb-2 select-none';
        btn.innerHTML = symbol;
        btn.style.fontFamily = "'Arial Unicode MS', 'Segoe UI Symbol', sans-serif";
        
        btn.onclick = () => handlePromotionSelection(key, targetRow, targetCol);
        optionsContainer.appendChild(btn);
    }

    modal.classList.remove('hidden');
}

function handlePromotionSelection(chosenPiece, targetRow, targetCol) {
    const modal = document.getElementById('promotion-modal');
    modal.classList.add('hidden');
    initialBoard[targetRow][targetCol] = chosenPiece;
    finalizeMove(chosenPiece, targetRow, targetCol);
}

// =========================================================================
// 2. ETKİLEŞİM VE HAMLE YÖNETİMİ
// =========================================================================
function handleSquareClick(event) {
    const square = event.currentTarget;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const pieceAtSquare = initialBoard[row][col];
    
    if (!isLocalPlay && currentPlayer !== myColor) return;
    
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

            if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
                const originalTargetPiece = initialBoard[row][col];
                const pieceToMove = initialBoard[selectedSquare.row][selectedSquare.col];
                
                initialBoard[row][col] = pieceToMove;
                initialBoard[selectedSquare.row][selectedSquare.col] = '';
                
                const isSafe = !isKingInCheck(currentPlayer);
                
                initialBoard[selectedSquare.row][selectedSquare.col] = pieceToMove;
                initialBoard[row][col] = originalTargetPiece;

                if (isSafe) {
                    movePiece(row, col);
                } else {
                    clearSelection();
                }
            } else {
                clearSelection();
            }
        }
    }
}

function selectSquare(square, row, col) {
    clearSelection();
    selectedSquare = { row, col };
    createBoard();
}

function clearSelection() {
    selectedSquare = null;
    createBoard();
}

function movePiece(targetRow, targetCol) {
    const pieceToMove = initialBoard[selectedSquare.row][selectedSquare.col];

    // YENİ: ROK HAFIZA GÜNCELLEMESİ (Taş oynarsa hak iptal olur)
    if (pieceToMove === 'K') { castlingRights.wK = false; castlingRights.wQ = false; }
    if (pieceToMove === 'k') { castlingRights.bK = false; castlingRights.bQ = false; }
    if (pieceToMove === 'R' && selectedSquare.row === 7 && selectedSquare.col === 7) castlingRights.wK = false;
    if (pieceToMove === 'R' && selectedSquare.row === 7 && selectedSquare.col === 0) castlingRights.wQ = false;
    if (pieceToMove === 'r' && selectedSquare.row === 0 && selectedSquare.col === 7) castlingRights.bK = false;
    if (pieceToMove === 'r' && selectedSquare.row === 0 && selectedSquare.col === 0) castlingRights.bQ = false;

    // Rok (Castling)
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

    initialBoard[targetRow][targetCol] = pieceToMove;
    initialBoard[selectedSquare.row][selectedSquare.col] = '';
    
    lastMove = { piece: pieceToMove, startRow: selectedSquare.row, startCol: selectedSquare.col, targetRow: targetRow, targetCol: targetCol };

    const isWhitePromotion = (pieceToMove === 'P' && targetRow === 0);
    const isBlackPromotion = (pieceToMove === 'p' && targetRow === 7);

    // movePiece fonksiyonu içindeki terfi kontrol alanını şu şekilde güncelle:
    if (isWhitePromotion || isBlackPromotion) {
        if (isBotPlay && currentPlayer === 'black') {
            // Bot ise direkt Vezir yap ve modal açma
            initialBoard[targetRow][targetCol] = 'q';
            finalizeMove('q', targetRow, targetCol);
        } else {
            showPromotionModal(currentPlayer, targetRow, targetCol);
        }
        clearSelection();
        return; 
    }

    finalizeMove(pieceToMove, targetRow, targetCol);
}

// Hamleyi bitirme, sırayı geçirme ve mat kontrolü
function finalizeMove(piece, targetRow, targetCol) {
    recordMove(piece, targetRow, targetCol);
    clearSelection();
    
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateTurnIndicator();
    createBoard();

   if (!isLocalPlay && !isBotPlay) {
        // Online oyunda Firebase'e kaydet
        saveGame(); //
    } else {
        // Yerel oyunda Firebase dinleyicisi olmadığı için geçmişi ve matı el ile çiziyoruz
        renderMoveHistory(); 
        setTimeout(() => {
            if (typeof checkGameOver === 'function') {
                checkGameOver();
            }
        }, 100);
    }
    // finalizeMove fonksiyonunun en sonuna, if(!isLocalPlay) kontrolünün hemen altına ekle:
    if (isBotPlay && currentPlayer === 'black') {
        makeBotMove();
    }
}

// OYUN SONU (MAT/PAT) KONTROLÜ
function checkGameOver() {
    if (!hasAnyValidMove(currentPlayer)) {
        if (isKingInCheck(currentPlayer)) {
            const winner = currentPlayer === 'white' ? 'Siyah' : 'Beyaz';
            alert(`ŞAH MAT! ${winner} kazandı!`);
        } else {
            alert("PAT! Geçerli hamle yok, oyun berabere.");
        }
    } else if (isKingInCheck(currentPlayer)) {
        console.log("Şah çekildi!");
    }
}

function updateTurnIndicator() {
    if(turnIndicator) {
        const turnText = currentPlayer === 'white' ? 'Beyaz' : 'Siyah';
        turnIndicator.innerHTML = `Sıra: <span class="text-slate-800 font-bold">${turnText}</span>`;
    }
}

// =========================================================================
// 3. MANTIK MOTORU: HAMLE DOĞRULAMA ALGORİTMALARI
// =========================================================================
function isPieceCurrentPlayers(piece) {
    const isWhite = piece === piece.toUpperCase();
    return (currentPlayer === 'white' && isWhite) || (currentPlayer === 'black' && !isWhite);
}

function isPieceColor(piece, color) {
    const isWhite = piece === piece.toUpperCase();
    return (color === 'white' && isWhite) || (color === 'black' && !isWhite);
}

function isKingInCheck(color) {
    let kingRow, kingCol;
    const kingSymbol = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (initialBoard[r][c] === kingSymbol) {
                kingRow = r; kingCol = c; break;
            }
        }
    }
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = initialBoard[r][c];
            if (piece !== '' && !isPieceColor(piece, color)) {
                if (isValidMove(r, c, kingRow, kingCol)) return true;
            }
        }
    }
    return false;
}

// YENİ: Belirli bir karenin rakip tarafından tehdit edilip edilmediğini tarar
function isSquareAttacked(targetRow, targetCol, defendingColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = initialBoard[r][c];
            if (piece !== '' && !isPieceColor(piece, defendingColor)) {
                if (isValidMove(r, c, targetRow, targetCol)) return true;
            }
        }
    }
    return false;
}

function isValidMove(startRow, startCol, targetRow, targetCol) {
    const piece = initialBoard[startRow][startCol];
    const type = piece.toLowerCase();
    if (startRow === targetRow && startCol === targetCol) return false;
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
                if (lastMove.targetRow === startRow && lastMove.targetCol === targetCol) return true;
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

function validateKnightMove(startRow, startCol, targetRow, targetCol) {
    const rowDiff = Math.abs(startRow - targetRow);
    const colDiff = Math.abs(startCol - targetCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function validateQueenMove(startRow, startCol, targetRow, targetCol) {
    return validateRookMove(startRow, startCol, targetRow, targetCol) || validateBishopMove(startRow, startCol, targetRow, targetCol);
}

function validateKingMove(startRow, startCol, targetRow, targetCol) {
    const rowDiff = Math.abs(startRow - targetRow);
    const colDiff = Math.abs(startCol - targetCol);

    if (rowDiff <= 1 && colDiff <= 1) return true;
    
    // ROK (Castling) KONTROLÜ
    if (rowDiff === 0 && colDiff === 2) {
        if (startCol !== 4) return false;

        const isWhite = initialBoard[startRow][startCol] === 'K';
        const color = isWhite ? 'white' : 'black';
        const isKingside = targetCol > startCol;
        
        // 1. ŞART: HAFIZA KONTROLÜ (Şah veya o yöndeki Kale daha önce oynamış mı?)
        if (isWhite) {
            if (isKingside && !castlingRights.wK) return false;
            if (!isKingside && !castlingRights.wQ) return false;
        } else {
            if (isKingside && !castlingRights.bK) return false;
            if (!isKingside && !castlingRights.bQ) return false;
        }

        const rookCol = isKingside ? 7 : 0;
        const myRook = isWhite ? 'R' : 'r';
        
        if (initialBoard[startRow][rookCol] === myRook) {
            const step = isKingside ? 1 : -1;
            let checkCol = startCol + step;
            
            // 2. ŞART: ARA KARELER BOŞ MU?
            while (checkCol !== rookCol) {
                if (initialBoard[startRow][checkCol] !== '') return false;
                checkCol += step;
            }
            
            // 3. ŞART: GÜVENLİK KONTROLLERİ
            if (isKingInCheck(color)) return false; // Şah çekilmişken rok atılamaz
            if (isSquareAttacked(startRow, startCol + step, color)) return false; // Ara kare tehdit altında olamaz
            
            return true;
        }
    }
    return false;
}

function hasAnyValidMove(color) {
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            const piece = initialBoard[startRow][startCol];
            if (piece !== '' && isPieceColor(piece, color)) {
                for (let targetRow = 0; targetRow < 8; targetRow++) {
                    for (let targetCol = 0; targetCol < 8; targetCol++) {
                        const targetPiece = initialBoard[targetRow][targetCol];
                        if (targetPiece !== '' && isPieceColor(targetPiece, color)) continue;
                        
                        if (isValidMove(startRow, startCol, targetRow, targetCol)) {
                            const originalTargetPiece = initialBoard[targetRow][targetCol];
                            initialBoard[targetRow][targetCol] = piece;
                            initialBoard[startRow][startCol] = '';

                            const isSafe = !isKingInCheck(color);

                            initialBoard[startRow][startCol] = piece;
                            initialBoard[targetRow][targetCol] = originalTargetPiece;
                            if (isSafe) return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

// =========================================================================
// 4. HAMLE GEÇMİŞİ VE NOTASYON MOTORU
// =========================================================================
function getAlgebraicNotation(row, col) {
    const file = String.fromCharCode(97 + col);
    const rank = 8 - row; 
    return file + rank;
}

function recordMove(piece, targetRow, targetCol) {
    const notation = getAlgebraicNotation(targetRow, targetCol);
    const pieceSymbol = piece.toLowerCase() === 'p' ? '' : pieceSymbols[piece];
    const moveText = pieceSymbol + notation;

    // Hamleyi ana dizimize ekliyoruz
    moveHistoryList.push(moveText);
}

function renderMoveHistory() {
    if (!moveHistoryContainer) return;
    moveHistoryContainer.innerHTML = ''; // Önceki listeyi temizle

    for (let i = 0; i < moveHistoryList.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = moveHistoryList[i];
        const blackMove = moveHistoryList[i + 1] || '';

        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex shrink-0 w-32 md:w-auto md:justify-between border-r md:border-r-0 md:border-b border-slate-200 pr-2 md:pr-0 md:pb-1 md:mb-1 mr-2 md:mr-0 items-center';

        const numSpan = document.createElement('span');
        numSpan.className = 'text-slate-400 w-6 font-bold text-xs';
        numSpan.textContent = moveNum + '.';

        const whiteSpan = document.createElement('span');
        whiteSpan.className = 'w-10 font-medium text-left';
        whiteSpan.textContent = whiteMove;

        const blackSpan = document.createElement('span');
        if (blackMove) {
            blackSpan.className = 'w-10 font-medium text-slate-800 text-right';
            blackSpan.textContent = blackMove;
        } else {
            blackSpan.className = 'w-10 text-right black-move-placeholder text-transparent';
            blackSpan.textContent = '...';
        }

        rowDiv.appendChild(numSpan);
        rowDiv.appendChild(whiteSpan);
        rowDiv.appendChild(blackSpan);
        moveHistoryContainer.appendChild(rowDiv);
    }

    // Listeyi en aşağı kaydır
    moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
    moveHistoryContainer.scrollLeft = moveHistoryContainer.scrollWidth;
}

// =========================================================================
// 5. FIREBASE VERİTABANI İŞLEMLERİ
// =========================================================================
function saveGame() {
    if (!currentRoomId) return;
    // games koleksiyonu altında oyun1 belgesini hedefliyoruz
    const gameRef = doc(db, "games", currentRoomId);

    setDoc(gameRef, {
        board: JSON.stringify(initialBoard), 
        turn: currentPlayer,       
        moveCount: moveNumber,
        history: moveHistoryList, // YENİ: Hamle geçmişi listesini Firebase'e gönderiyoruz
        lastMove: lastMove,   // YENİ: Son hamleyi Firebase'e gönderiyoruz
        castlingRights: castlingRights,
        lastUpdate: new Date()    
    }, { merge: true }).then(() => {
        console.log("Harika! Hamle başarıyla Firebase'e kaydedildi!");
    }).catch(e => {
        console.error("Firebase'e kaydederken hata oluştu:", e);
    });
}

// listenGame fonksiyonunu şu şekilde değiştir:
function listenGame(roomId) {
    const gameRef = doc(db, "games", roomId);

    onSnapshot(gameRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            initialBoard = typeof data.board === 'string' ? JSON.parse(data.board) : data.board;
            currentPlayer = data.turn;
            moveNumber = data.moveCount;
            moveHistoryList = data.history || []; // Buluttan hamle geçmişini alıyoruz
            lastMove = data.lastMove || null; // YENİ: Buluttan son hamleyi alıyoruz
            castlingRights = data.castlingRights || { wK: true, wQ: true, bK: true, bQ: true };
            
            createBoard();
            updateTurnIndicator();
            renderMoveHistory(); // Hamle geçmişini iki tarafta da güncelliyoruz
            
            // --- EKLENEN YENİ KISIM ---
            // Tahta ve hamle geçmişi çizildikten hemen sonra mat durumunu iki taraf için de kontrol et
            setTimeout(() => {
                // Not: Kendi kodundaki mat/oyun sonu kontrol fonksiyonunun adını buraya yazmalısın.
                // Eğer adını checkGameOver koyduysan bu şekilde kalabilir:
                if (typeof checkGameOver === 'function') {
                    checkGameOver(); 
                }
            }, 100); // 100 milisaniye gecikme veriyoruz ki önce son hamle ekranda görünsün, sonra mat uyarısı çıksın.
            // --------------------------
        }
    });
}

// Bot için o anki tüm kurallı hamleleri toplayan fonksiyon
function getAllValidMoves(color) {
    let validMoves = [];
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            const piece = initialBoard[startRow][startCol];
            if (piece !== '' && isPieceColor(piece, color)) {
                for (let targetRow = 0; targetRow < 8; targetRow++) {
                    for (let targetCol = 0; targetCol < 8; targetCol++) {
                        const targetPiece = initialBoard[targetRow][targetCol];
                        if (targetPiece !== '' && isPieceColor(targetPiece, color)) continue;
                        
                        if (isValidMove(startRow, startCol, targetRow, targetCol)) {
                            const originalTargetPiece = initialBoard[targetRow][targetCol];
                            initialBoard[targetRow][targetCol] = piece;
                            initialBoard[startRow][startCol] = '';

                            const isSafe = !isKingInCheck(color);

                            initialBoard[startRow][startCol] = piece;
                            initialBoard[targetRow][targetCol] = originalTargetPiece;
                            
                            if (isSafe) {
                                validMoves.push({ startRow, startCol, targetRow, targetCol, piece });
                            }
                        }
                    }
                }
            }
        }
    }
    return validMoves;
}

// Botun hamle yapmasını sağlayan ana tetikleyici
function makeBotMove() {
    if (!isBotPlay || currentPlayer !== 'black') return;

    setTimeout(() => {
        const legalMoves = getAllValidMoves('black');
        if (legalMoves.length === 0) return; 

        let chosenMove = null;

        if (botLevel === 1) {
            // 1. SEVİYE: Tamamen Rastgele
            chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        } 
        else if (botLevel >= 2) {
            // 2. SEVİYE: Açgözlü (En yüksek puanı getiren hamleyi bul)
            let bestScore = -Infinity;
            let bestMoves = [];

            for (const move of legalMoves) {
                // A. Hamleyi sanal olarak yap (Tahtada dene)
                const originalTargetPiece = initialBoard[move.targetRow][move.targetCol];
                const pieceToMove = initialBoard[move.startRow][move.startCol];
                
                initialBoard[move.targetRow][move.targetCol] = pieceToMove;
                initialBoard[move.startRow][move.startCol] = '';

                // B. Tahtanın yeni durumunu puanla
                const currentScore = evaluateBoard();

                // C. Hamleyi geri al (Orijinal tahtayı bozmamak için)
                initialBoard[move.startRow][move.startCol] = pieceToMove;
                initialBoard[move.targetRow][move.targetCol] = originalTargetPiece;

                // D. Skoru değerlendir
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestMoves = [move]; // Yeni bir "en iyi" bulundu, havuzu temizle ve bunu ekle
                } else if (currentScore === bestScore) {
                    bestMoves.push(move); // Eşit puanlı alternatif bir hamle bulundu, havuzda biriktir
                }
            }
            
            // Aynı maksimum puanı veren eşit karlı hamleler arasından sürpriz faktörü için rastgele seç
            chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        // Seçilen en iyi hamleyi uygula
        if (chosenMove) {
            selectedSquare = { row: chosenMove.startRow, col: chosenMove.startCol };
            movePiece(chosenMove.targetRow, chosenMove.targetCol);
        }
    }, 600);
}

// Tahtanın o anki puanını hesaplar (Siyah taşlar +, Beyaz taşlar - puan)
function evaluateBoard() {
    let totalEvaluation = 0;
    // Satrançtaki evrensel taş değerleri (Şah için ulaşılamaz yüksek bir değer verilir)
    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 1000,   // Siyah (Bot) taşları puan kazandırır
        'P': -1, 'N': -3, 'B': -3, 'R': -5, 'Q': -9, 'K': -1000 // Beyaz (Oyuncu) taşları puan eksiltir
    };
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = initialBoard[r][c];
            if (piece !== '') {
                totalEvaluation += pieceValues[piece];
            }
        }
    }
    return totalEvaluation;
}

// =========================================================================
// BAŞLANGIÇ ÇALIŞTIRMALARI
// =========================================================================
updateTurnIndicator();
createBoard();
