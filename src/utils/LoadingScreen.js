import LoadingScreenCSS from './LoadingScreen.css';
import LoadingScreenHTML from './LoadingScreen.html';
import { VIEW_EVENTS } from '../Core/View';

export default {
    init(viewerDiv, view, options) {
        let loadingScreenContainer;
        let styleNode;
        if (!options.loadingScreen || options.loadingScreen === 'itowns') {
            styleNode = document.createElement('style');
            styleNode.innerHTML = LoadingScreenCSS;
            document.body.appendChild(styleNode);
            // loading screen
            viewerDiv.insertAdjacentHTML('beforeend', LoadingScreenHTML);
            loadingScreenContainer = document.getElementById('itowns-loader');
        } else if (typeof (options.loadingScreen) === 'string') {
            loadingScreenContainer = document.getElementById(options.loadingScreen);
        } else if (options.loadingScreen instanceof (Element)) {
            loadingScreenContainer = options.loadingScreen;
        } else {
            throw new Error('Invalid value for options.loadingScreen. Expected: false, string or HTMLElement');
        }

        // auto-hide in 3 sec or if view is loaded
        const hideLoader = () => {
            if (!loadingScreenContainer) {
                return;
            }
            loadingScreenContainer.style.opacity = 0;
            loadingScreenContainer.style.pointerEvents = 'none';
            loadingScreenContainer.style.transition = 'opacity 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53)';

            loadingScreenContainer.addEventListener('transitionend', (e) => {
                document.body.removeChild(styleNode);
                viewerDiv.removeChild(e.target);
            });
            loadingScreenContainer = null;
            view.mainLoop.removeEventListener(hideLoader);
        };
        view.addEventListener(VIEW_EVENTS.INITIALIZED, hideLoader);
        setTimeout(hideLoader, 3000);
    },
};
