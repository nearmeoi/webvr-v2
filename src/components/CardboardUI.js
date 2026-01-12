/**
 * CardboardUI - A 2D overlay for the Cardboard VR mode
 * Provides Back button, Gear icon, and Center Divider
 */
export class CardboardUI {
    constructor(onExit, onSettings) {
        this.onExit = onExit;
        this.onSettings = onSettings;
        this.container = null;

        this.createUI();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Allow clicks to pass through to canvas (except buttons)
            zIndex: '1000',
            display: 'none',
            fontFamily: 'sans-serif'
        });

        // 1. Back Button (Top Left) - REMOVED per user request
        /*
        const backBtn = document.createElement('div');
        backBtn.innerHTML = '&#8592;'; // Left Arrow
        Object.assign(backBtn.style, {
            position: 'absolute',
            top: '20px',
            right: '20px', // Moved to Top Right
            left: 'auto',
            color: 'white',
            fontSize: '40px',
            fontWeight: 'bold',
            cursor: 'pointer',
            pointerEvents: 'auto', // Enable click
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            opacity: '0.8',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent canvas click interactions
            if (this.onExit) this.onExit();
        });
        this.container.appendChild(backBtn);
        */

        // 2. Gear Icon (Bottom Center) - REMOVED per user request
        /*
        const gearBtn = document.createElement('div');
        gearBtn.innerHTML = '&#9881;'; // Gear symbol
        Object.assign(gearBtn.style, {
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: '32px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            opacity: '0.8',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        gearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onSettings) this.onSettings();
        });
        this.container.appendChild(gearBtn);
        */

        // 3. Center Divider Line - REMOVED per user request
        /*
        const divider = document.createElement('div');
        Object.assign(divider.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '4px', // Thicker line
            height: '100%',
            background: '#ffffff', // Solid white
            transform: 'translate(-50%, -50%)'
        });
        this.container.appendChild(divider);
        */

        document.body.appendChild(this.container);
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
