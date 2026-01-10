// * SECURITY *

(function() {
    'use strict';

    const preventAction = (e) => {
        e.preventDefault();
        return false;
    };

    // 1. Chặn các phím tắt phổ biến (F12, Ctrl+Shift+I/J/C, Ctrl+U)
    document.addEventListener('keydown', (e) => {
        const isControl = e.ctrlKey || e.metaKey; // Hỗ trợ cả phím Command trên Mac
        const isShift = e.shiftKey;
        const key = e.key.toUpperCase();

        if (
            e.key === 'F12' || 
            (isControl && isShift && ['I', 'J', 'C'].includes(key)) || 
            (isControl && key === 'U')
        ) {
            return preventAction(e);
        }
    });

    // 2. Chặn menu chuột phải
    document.addEventListener('contextmenu', preventAction);

    // 3. Chặn kéo thả hình ảnh
    document.addEventListener('dragstart', preventAction);

    // 4. Phát hiện và gây khó khăn cho việc mở DevTools
    const checkDevTools = function() {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            console.warn("DevTools is active!");
            (function() { return false; ['constructor']('debugger')(); })();
        }
    };

    window.addEventListener('resize', checkDevTools);
    checkDevTools(); // Chạy khi vừa load trang

})();