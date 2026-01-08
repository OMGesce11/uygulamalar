document.addEventListener('DOMContentLoaded', function() {
    // Canvas ve context ayarları
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // Canvas boyutlarını ayarla
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
        redraw();
    }
    
    // Değişkenler
    let drawing = false;
    let currentTool = 'brush';
    let currentColor = '#ff0000';
    let brushSize = 5;
    let lastX = 0;
    let lastY = 0;
    let history = [];
    const maxHistory = 50;
    
    // Başlangıç ayarları
    function initializeCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        saveState();
    }
    
    // Çizim durumunu kaydet
    function saveState() {
        if (history.length >= maxHistory) {
            history.shift();
        }
        history.push(canvas.toDataURL());
    }
    
    // Önceki duruma dön
    function undo() {
        if (history.length > 1) {
            history.pop(); // Mevcut durumu kaldır
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = history[history.length - 1];
        } else {
            initializeCanvas();
        }
    }
    
    // Canvas'ı yeniden çiz
    function redraw() {
        if (history.length > 0) {
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
            };
            img.src = history[history.length - 1];
        }
    }
    
    // Çizim fonksiyonları
    function startDrawing(e) {
        drawing = true;
        const pos = getMousePos(e);
        [lastX, lastY] = [pos.x, pos.y];
        
        if (currentTool === 'brush') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
        }
    }
    
    function draw(e) {
        if (!drawing) return;
        
        e.preventDefault();
        const pos = getMousePos(e);
        const x = pos.x;
        const y = pos.y;
        
        if (currentTool === 'brush') {
            ctx.lineWidth = brushSize;
            ctx.strokeStyle = currentColor;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (currentTool === 'eraser') {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = brushSize;
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();
        }
        
        [lastX, lastY] = [x, y];
    }
    
    function stopDrawing() {
        if (drawing) {
            drawing = false;
            ctx.closePath();
            saveState();
        }
    }
    
    // Fare/touch pozisyonunu al
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if (e.type.includes('touch')) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        // Canvas scaling için ayar
        x *= canvas.width / rect.width;
        y *= canvas.height / rect.height;
        
        return { x, y };
    }
    
    // Canvas'ı temizle
    function clearCanvas() {
        if (confirm('Tüm çizimi silmek istediğinize emin misiniz?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            history = [];
            saveState();
        }
    }
    
    // Çizimi kaydet
    function saveDrawing() {
        try {
            // Canvas'ı data URL'ye çevir
            const dataURL = canvas.toDataURL('image/png');
            
            // APK builder'ın desteklediği kaydetme yöntemi
            if (window.Android && typeof window.Android.saveImage === 'function') {
                // Android için native fonksiyon
                window.Android.saveImage(dataURL);
            } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.saveImage) {
                // iOS için
                window.webkit.messageHandlers.saveImage.postMessage(dataURL);
            } else {
                // Tarayıcı için alternatif yöntem
                const link = document.createElement('a');
                link.download = 'resim-cizimi-' + Date.now() + '.png';
                link.href = dataURL;
                link.click();
            }
            
            // Başarı mesajını göster
            showSuccessModal();
        } catch (error) {
            alert('Kayıt sırasında hata oluştu: ' + error.message);
        }
    }
    
    // Başarı modal'ını göster
    function showSuccessModal() {
        const modal = document.getElementById('successModal');
        modal.style.display = 'flex';
    }
    
    // Modal'ı kapat
    function closeModal() {
        const modal = document.getElementById('successModal');
        modal.style.display = 'none';
    }
    
    // Paylaş
    function shareDrawing() {
        try {
            canvas.toBlob(function(blob) {
                if (navigator.share && navigator.canShare) {
                    const file = new File([blob], 'resim-cizimi.png', { type: 'image/png' });
                    
                    if (navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: 'Resim Çizimi',
                            text: 'Bu resmi Resim Çiz uygulamasında çizdim!'
                        });
                    } else {
                        // Dosya paylaşımı desteklenmiyorsa, data URL ile paylaş
                        const dataURL = canvas.toDataURL('image/png');
                        navigator.share({
                            title: 'Resim Çizimi',
                            text: 'Bu resmi Resim Çiz uygulamasında çizdim!',
                            url: dataURL
                        });
                    }
                } else {
                    alert('Paylaşım bu cihazda desteklenmiyor. Çizimi kaydedip manuel paylaşabilirsiniz.');
                }
            }, 'image/png');
        } catch (error) {
            alert('Paylaşım sırasında hata oluştu: ' + error.message);
        }
    }
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        startDrawing(e);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        draw(e);
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopDrawing);
    
    // Araç butonları
    document.getElementById('brush').addEventListener('click', function() {
        currentTool = 'brush';
        updateToolButtons(this);
    });
    
    document.getElementById('eraser').addEventListener('click', function() {
        currentTool = 'eraser';
        updateToolButtons(this);
    });
    
    document.getElementById('clear').addEventListener('click', clearCanvas);
    document.getElementById('save').addEventListener('click', saveDrawing);
    document.getElementById('share').addEventListener('click', shareDrawing);
    document.getElementById('undo').addEventListener('click', undo);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    
    // Renk seçici
    document.getElementById('colorPicker').addEventListener('input', function(e) {
        currentColor = e.target.value;
        updateColorPalette(e.target.value);
    });
    
    // Fırça kalınlığı
    document.getElementById('brushSize').addEventListener('input', function(e) {
        brushSize = e.target.value;
    });
    
    // Renk paleti
    document.querySelectorAll('.color').forEach(color => {
        color.addEventListener('click', function() {
            currentColor = this.getAttribute('data-color');
            document.getElementById('colorPicker').value = currentColor;
            updateColorPalette(currentColor);
        });
    });
    
    // Araç butonlarını güncelle
    function updateToolButtons(activeButton) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
    
    // Renk paletini güncelle
    function updateColorPalette(color) {
        document.querySelectorAll('.color').forEach(c => {
            c.classList.remove('active-color');
            if (c.getAttribute('data-color') === color) {
                c.classList.add('active-color');
            }
        });
    }
    
    // Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
    window.addEventListener('resize', resizeCanvas);
    
    // Modal dışına tıklandığında kapat
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('successModal');
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Uygulamayı başlat
    resizeCanvas();
    initializeCanvas();
    
    // Başlangıçta aktif rengi ayarla
    updateColorPalette(currentColor);
});