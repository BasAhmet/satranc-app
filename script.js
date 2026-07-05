// script.js
const boardContainer = document.getElementById('board-container');

function createBoard() {
    // İçerideki geçici "8x8 Satranç Tahtası Buraya Gelecek..." yazısını temizle
    boardContainer.innerHTML = ''; 
    
    // Tahtanın ana iskeletini Tailwind grid yapısıyla kuruyoruz
    // w-80 h-80 (mobilde), sm:w-96 sm:h-96 (daha büyük ekranlarda)
    boardContainer.className = 'grid grid-cols-8 grid-rows-8 w-80 h-80 sm:w-96 sm:h-96 border-4 border-gray-800 mx-auto shadow-lg rounded-sm overflow-hidden';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            
            // Satranç tahtası mantığı: Satır ve sütun toplamı çiftse açık, tekse koyu renk
            const isLight = (row + col) % 2 === 0;
            
            // Göz yormayan minimalist renkler
            const bgColor = isLight ? 'bg-gray-100' : 'bg-gray-500';
            
            // Karenin stillerini ekle
            square.className = `w-full h-full flex items-center justify-center text-3xl cursor-pointer ${bgColor}`;
            
            // İleride hamle mantığı için koordinatları elementin data özelliklerine gömüyoruz
            square.dataset.row = row;
            square.dataset.col = col;

            boardContainer.appendChild(square);
        }
    }
}

// Fonksiyonu başlat
createBoard();
