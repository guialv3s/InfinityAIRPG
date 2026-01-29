// 3D Dice Roller (Vanilla JS + Three.js + Cannon.js)

(function () {
    // Configuration
    const DICE_TEXTURES = [
        'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=1', // Right (+x)
        'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=2', // Left (-x)
        'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=3', // Top (+y)
        'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=4', // Bottom (-y)
        'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=5', // Front (+z)
        'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=6', // Back (-z)
    ];

    let scene, camera, renderer;
    let world;
    let diceBody, diceMesh;
    let floorBody, floorMesh;
    let isRolling = false;
    let stoppedTime = 0;
    let animationId;
    let container;
    let resultCallback = null;

    window.initDiceRoller = function (containerId) {
        console.log("Initializing Dice Roller in container:", containerId); // DEBUG
        container = document.getElementById(containerId);
        if (!container) {
            console.error("Dice container not found:", containerId);
            return;
        }

        console.log("Container dimensions:", container.clientWidth, "x", container.clientHeight);

        // Force container style if missing
        container.style.position = 'relative';

        // Cleanup if already initialized
        container.innerHTML = '';

        // 1. Setup Three.js
        setupGraphics();

        // 2. Setup Cannon.js
        setupPhysics();

        // 3. Create Objects
        createFloor();
        createWalls(); // Invisible Walls
        createDice();

        // 4. Create UI
        createUI();

        // 5. Start Loop
        animate();

        // 6. Handle Resize
        window.addEventListener('resize', onWindowResize, false);
    };

    function setupGraphics() {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Black to blend with table edges

        // Camera
        let width = container.clientWidth;
        let height = container.clientHeight;

        // Fallback if dimensions are 0 (e.g. hidden sidebar)
        if (width === 0) width = 250;
        if (height === 0) height = 200;

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        // Move closer to fill the view
        camera.position.set(0, 8, 8);
        camera.lookAt(0, 0, 0);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        // Force canvas to fill container visually
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block'; // Remove inline-block spacing
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // Lights (Tavern Style)
        const ambientLight = new THREE.AmbientLight(0x4a4069, 0.4);
        scene.add(ambientLight);

        const spotLight = new THREE.PointLight(0xffaa00, 1.5);
        spotLight.position.set(5, 10, 5);
        spotLight.castShadow = true;
        scene.add(spotLight);

        const magicLight = new THREE.PointLight(0x9d4edd, 0.8);
        magicLight.position.set(-5, 5, -5);
        scene.add(magicLight);
    }

    function setupPhysics() {
        world = new CANNON.World();
        world.gravity.set(0, -20, 0); // Higher gravity feels weightier
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 10;
        world.defaultContactMaterial.friction = 0.3;
        world.defaultContactMaterial.restitution = 0.5;
    }

    function createFloor() {
        // Physics
        const shape = new CANNON.Plane();
        floorBody = new CANNON.Body({ mass: 0 }); // Static
        floorBody.addShape(shape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        floorBody.position.set(0, -2, 0);
        world.addBody(floorBody);

        // Visual
        const loader = new THREE.TextureLoader();
        const texture = loader.load('assets/bg-rpg-table.jpg');
        // If the texture is large, maybe tile it, but for a tabletop look, stretching is often okay if it's high res.
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);

        const geometry = new THREE.PlaneGeometry(50, 50);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.6,
            metalness: 0.1,
            color: 0xaaaaaa // Tint slightly
        });
        floorMesh = new THREE.Mesh(geometry, material);
        floorMesh.quaternion.copy(floorBody.quaternion); // Sync init rotation
        floorMesh.position.copy(floorBody.position);
        floorMesh.receiveShadow = true;
        scene.add(floorMesh);
    }

    function createWalls() {
        const wallMaterial = new CANNON.Material();
        wallMaterial.friction = 0.0; // Low friction for walls so dice slides off
        wallMaterial.restitution = 0.5; // Bouncy

        // Create 4 walls to keep dice in view
        // Camera is at (0, 10, 10), looking at (0,0,0).
        // Field of view is ~10-15 units wide at ground level.

        const wallDistance = 7; // Distance from center
        const wallHeight = 20;

        const positions = [
            { pos: [0, 0, -wallDistance], rot: [0, 0, 0] }, // Back Wall
            { pos: [0, 0, wallDistance], rot: [0, Math.PI, 0] }, // Front Wall
            { pos: [-wallDistance, 0, 0], rot: [0, Math.PI / 2, 0] }, // Left Wall
            { pos: [wallDistance, 0, 0], rot: [0, -Math.PI / 2, 0] }  // Right Wall
        ];

        positions.forEach(p => {
            const wallShape = new CANNON.Plane();
            const wallBody = new CANNON.Body({ mass: 0, material: wallMaterial }); // Static
            wallBody.addShape(wallShape);

            // Set position
            wallBody.position.set(...p.pos);

            // Set rotation (Plane normal usually points Z+, rotate to face center)
            const q = new CANNON.Quaternion();
            q.setFromEuler(...p.rot);
            wallBody.quaternion.copy(q);

            world.addBody(wallBody);

            // Optional: Debug Visual Walls (Comment out for "Invisible")
            /*
            const geo = new THREE.PlaneGeometry(20, 20);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.1 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(wallBody.position);
            mesh.quaternion.copy(wallBody.quaternion);
            scene.add(mesh);
            */
        });
    }

    function createDice() {
        // Textures
        const loader = new THREE.TextureLoader();
        const materials = DICE_TEXTURES.map(url => {
            return new THREE.MeshStandardMaterial({
                map: loader.load(url),
                roughness: 0.4
            });
        });

        // 1. Right (+x), 2. Left (-x), 3. Top (+y), 4. Bottom (-y), 5. Front (+z), 6. Back (-z)
        // Three.js BoxGeometry Mapping Order: Right, Left, Top, Bottom, Front, Back.
        // Perfect match with our array.

        // Visual
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        diceMesh = new THREE.Mesh(geometry, materials);
        diceMesh.castShadow = true;
        diceMesh.position.set(0, 5, 0);
        scene.add(diceMesh);

        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1)); // Half extents
        diceBody = new CANNON.Body({ mass: 1 });
        diceBody.addShape(shape);
        diceBody.position.set(0, 5, 0);
        diceBody.angularDamping = 0.5;
        diceBody.linearDamping = 0.1;
        world.addBody(diceBody);
    }

    function createUI() {
        // Overlay Button
        const uiDiv = document.createElement('div');
        uiDiv.style.position = 'absolute';
        uiDiv.style.top = '20px';
        uiDiv.style.left = '50%';
        uiDiv.style.transform = 'translateX(-50%)';
        uiDiv.style.zIndex = '100000'; // MAX VISIBILITY
        uiDiv.style.textAlign = 'center';
        uiDiv.style.width = '100%';
        uiDiv.style.pointerEvents = 'none'; // Let clicks pass through container, but button catches them

        const button = document.createElement('button');
        button.innerText = 'ROLAR DADOS';
        button.className = 'roll-dice-btn'; // Use CSS class for animation
        button.style.pointerEvents = 'auto'; // Keep minimal functional style inline if needed, but class is better

        button.onclick = rollDice;

        const resultDisplay = document.createElement('div');
        resultDisplay.id = 'dice-result';
        resultDisplay.style.marginTop = '10px';
        resultDisplay.style.fontSize = '1.5rem';
        resultDisplay.style.fontWeight = 'bold';
        resultDisplay.style.color = '#ffcf33';
        resultDisplay.style.textShadow = '0 0 10px rgba(255, 207, 51, 0.5)';
        resultDisplay.style.minHeight = '30px';

        uiDiv.appendChild(button);
        uiDiv.appendChild(resultDisplay);
        container.appendChild(uiDiv);

        // --- Close Button (JS Injected for reliability) ---
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '❌';
        closeBtn.title = 'Fechar';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '10px';
        closeBtn.style.background = 'rgba(0, 0, 0, 0.6)';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.width = '30px';
        closeBtn.style.height = '30px';
        closeBtn.style.fontSize = '14px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '200001'; // Higher than overlay
        closeBtn.style.pointerEvents = 'auto';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';

        closeBtn.onclick = function (e) {
            e.stopPropagation();
            console.log("Close button clicked (JS)");
            // Dispatch event for game.js to handle
            window.dispatchEvent(new Event('dice-close-request'));
        };

        container.appendChild(closeBtn);
    }

    function rollDice() {
        if (isRolling) return;

        isRolling = true;
        stoppedTime = 0;
        document.getElementById('dice-result').innerText = '';

        // Reset Position
        diceBody.position.set(0, 5 + Math.random(), 0);
        diceBody.velocity.set(0, 0, 0);
        diceBody.angularVelocity.set(0, 0, 0);
        diceBody.quaternion.set(0, 0, 0, 1); // Reset rotation

        // Impulse (Kick)
        const xKick = (Math.random() - 0.5) * 10;
        const zKick = (Math.random() - 0.5) * 10;
        diceBody.applyImpulse(new CANNON.Vec3(xKick, 10, zKick), new CANNON.Vec3(0, 0, 0));

        // Torque (Spin)
        const xSpin = (Math.random() - 0.5) * 50;
        const ySpin = (Math.random() - 0.5) * 50;
        const zSpin = (Math.random() - 0.5) * 50;
        diceBody.applyTorque(new CANNON.Vec3(xSpin, ySpin, zSpin));
    }

    function animate() {
        animationId = requestAnimationFrame(animate);

        // Step Physics (Fixed time step)
        world.step(1 / 60);

        // Sync Visuals
        diceMesh.position.copy(diceBody.position);
        diceMesh.quaternion.copy(diceBody.quaternion);

        // Render
        renderer.render(scene, camera);

        // Check for Stop
        if (isRolling) {
            const v = diceBody.velocity;
            const speed = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);

            if (speed < 0.05) {
                stoppedTime += 1 / 60; // Approximate delta
            } else {
                stoppedTime = 0;
            }

            if (stoppedTime > 0.5) {
                isRolling = false;
                calculateResult();
            }
        }
    }

    function calculateResult() {
        // Get Dice Quaternion
        const q = diceBody.quaternion;
        const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);

        // Define local face normals and values
        // Order must match textures: Right, Left, Top, Bottom, Front, Back
        const faces = [
            { dir: new THREE.Vector3(1, 0, 0), val: 1 },  // Right
            { dir: new THREE.Vector3(-1, 0, 0), val: 2 }, // Left
            { dir: new THREE.Vector3(0, 1, 0), val: 3 },  // Top
            { dir: new THREE.Vector3(0, -1, 0), val: 4 }, // Bottom
            { dir: new THREE.Vector3(0, 0, 1), val: 5 },  // Front
            { dir: new THREE.Vector3(0, 0, -1), val: 6 }  // Back
        ];

        let maxDot = -Infinity;
        let result = 1;

        const up = new THREE.Vector3(0, 1, 0);

        faces.forEach(face => {
            // Transform local vector to world space
            const worldDir = face.dir.clone().applyQuaternion(quaternion);
            const dot = worldDir.dot(up);

            if (dot > maxDot) {
                maxDot = dot;
                result = face.val;
            }
        });

        document.getElementById('dice-result').innerText = result;
        console.log("Rolled Result:", result);
    }

    function onWindowResize() {
        if (!camera || !renderer || !container) return;
        let width = container.clientWidth;
        let height = container.clientHeight;

        if (width === 0) width = 250;
        if (height === 0) height = 200;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

})();
