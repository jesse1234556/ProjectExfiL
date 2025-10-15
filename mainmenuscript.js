// Select all triangle SVGs
const triangles = document.querySelectorAll('.triangle');

triangles.forEach(triangle => {
    let rotation = 0;
    let speed = 72; // initial speed in degrees/sec
    let lastTime = null;

    const actions = [
        72,   // normal spin
        180,  // medium
        360,  // fast
        30,   // slow
        720   // ultra-fast
    ];

    function chooseAction() {
        const r = Math.random();
        if (r < 0.35) return actions[0];    // 35% normal
        if (r < 0.55) return actions[1];    // 20% medium
        if (r < 0.75) return actions[2];    // 20% fast
        if (r < 0.90) return actions[3];    // 15% slow
        return actions[4];                   // 10% ultra-fast
    }

    let speedTimeout; // reference for clearing on hover

    function scheduleNextSpeed() {
        const delay = 500 + Math.random() * 1000; // 500-1500ms
        speedTimeout = setTimeout(() => {
            speed = chooseAction();
            scheduleNextSpeed(); // schedule next tick
        }, delay);
    }

    scheduleNextSpeed(); // start random speed updates

    function animate(time) {
        if (!lastTime) lastTime = time;
        const delta = (time - lastTime) / 1000; // seconds
        lastTime = time;

        rotation += speed * delta;
        rotation %= 360;
        triangle.style.transform = `rotate(${rotation}deg)`;

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    // Parent div for hover detection
    const parentDiv = triangle.closest('.option');

    parentDiv.addEventListener('mouseenter', () => {
        clearTimeout(speedTimeout); // stop random changes
        speed = 720; // constant ultra-fast
    });

    parentDiv.addEventListener('mouseleave', () => {
        speed = 80;
        setTimeout(1000); 
        scheduleNextSpeed(); // resume random speed changes
    });

    document.querySelectorAll('.option').forEach(option => {
        console.log(option); // should print the div with data-target
    option.addEventListener('click', () => {
        console.log("hehhfgh");
        const targetPage = option.getAttribute('data-target');
        console.log(targetPage);
        if (targetPage) {
            
            window.location.href = targetPage; // redirects to new page
        }
    });
});
    
});
