import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import { useTexture, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants & Resources ---
// Using placeholder textures for immediate functionality. 
// Replace these URLs with high-quality RPG dice textures in production.
const DICE_TEXTURES = [
    'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=1', // Right
    'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=2', // Left
    'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=3', // Top
    'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=4', // Bottom
    'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=5', // Front
    'https://dummyimage.com/512x512/3c096c/e0aaff.png&text=6', // Back
];

// --- Physics Components ---

// 1. The Floor (Plane)
const Floor = () => {
    const [ref] = usePlane(() => ({
        rotation: [-Math.PI / 2, 0, 0], // Rotate to be horizontal
        position: [0, -2, 0],
        material: { friction: 0.3, restitution: 0.5 }, // Non-slippery, bouncy enough
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial
                color="#1a0f2e"
                roughness={0.8}
                metalness={0.2}
            />
        </mesh>
    );
};

// 2. The D6 Dice
const Dice = ({ onRollComplete, isRolling, triggerRoll }) => {
    // Load textures
    const textures = useTexture(DICE_TEXTURES);

    // Physics body
    const [ref, api] = useBox(() => ({
        mass: 1,
        position: [0, 5, 0], // Start high
        args: [2, 2, 2], // Size 2x2x2
        material: { friction: 0.3, restitution: 0.6 },
        angularDamping: 0.5,
        linearDamping: 0.1,
    }));

    // State to track if we are currently checking for a stop
    const rollingRef = useRef(false);
    const stoppedTimeRef = useRef(0);

    // Apply Force when triggered
    useEffect(() => {
        if (triggerRoll) {
            // Reset position slightly varied
            api.position.set(0, 5 + Math.random(), 0);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);

            // Give it a kick (Impulse upwards and random side)
            const xImpulse = (Math.random() - 0.5) * 10;
            const zImpulse = (Math.random() - 0.5) * 10;
            api.applyImpulse([xImpulse, 10, zImpulse], [0, 0, 0]);

            // Spin it wildly (Torque)
            const xTorque = (Math.random() - 0.5) * 50;
            const yTorque = (Math.random() - 0.5) * 50;
            const zTorque = (Math.random() - 0.5) * 50;
            api.applyTorque([xTorque, yTorque, zTorque]);

            rollingRef.current = true;
            stoppedTimeRef.current = 0;
        }
    }, [triggerRoll, api]);

    // Check for stop and determine result
    useFrame(() => {
        if (!rollingRef.current) return;

        // Get current velocity
        const velocity = ref.current.getWorldPosition(new THREE.Vector3()); // Just to access ref, use api.velocity subscribers in real complex apps, but here we can check roughly
        // Better: React-Three-Cannon provides subscription, but strictly inside useFrame we can check simple ref if updated, 
        // OR better yet, subscribe to velocity to store it in a ref for check.
        // Simplified check: Use the internal velocity that cannon updates? 
        // Standard way: subscribe to velocity
    });

    // Velocity Subscription for Logic
    const velocity = useRef([0, 0, 0]);
    useEffect(() => {
        const unsubscribe = api.velocity.subscribe((v) => (velocity.current = v));
        return unsubscribe;
    }, [api.velocity]);

    useFrame((state, delta) => {
        if (!rollingRef.current) return;

        const v = velocity.current;
        const speed = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);

        // Threshold for "stopped"
        if (speed < 0.05) {
            stoppedTimeRef.current += delta;
        } else {
            stoppedTimeRef.current = 0;
        }

        // If stopped for > 0.5s, calculate result
        if (stoppedTimeRef.current > 0.5) {
            rollingRef.current = false;
            calculateResult();
        }
    });

    const calculateResult = () => {
        // Calculate which face is up based on quaternion rotation
        // Standard D6 Face Normals relative to local space:
        // 1: +X, 2: -X, 3: +Y, 4: -Y, 5: +Z, 6: -Z (Depends on map, let's assume standard cube map order)

        // Standard Three.js BoxGeometry UV mapping maps the array of 6 materials to:
        // 0: Right (+x), 1: Left (-x), 2: Top (+y), 3: Bottom (-y), 4: Front (+z), 5: Back (-z)

        // Let's verify standard alignment.
        // We need to transform these local vectors by the object's quaternion to world space,
        // then dot product with World Up (0, 1, 0). The highest dot product is the "Up" face.

        const quaternion = new THREE.Quaternion();
        ref.current.getWorldQuaternion(quaternion);

        const faces = [
            { dir: new THREE.Vector3(1, 0, 0), val: 1 },  // Right
            { dir: new THREE.Vector3(-1, 0, 0), val: 2 }, // Left
            { dir: new THREE.Vector3(0, 1, 0), val: 3 },  // Top
            { dir: new THREE.Vector3(0, -1, 0), val: 4 }, // Bottom
            { dir: new THREE.Vector3(0, 0, 1), val: 5 },  // Front
            { dir: new THREE.Vector3(0, 0, -1), val: 6 }, // Back
        ];

        let maxDot = -Infinity;
        let result = 1;

        faces.forEach(face => {
            // Transform local face normal to world space
            const worldDir = face.dir.clone().applyQuaternion(quaternion);
            // Dot product with Global Up (0, 1, 0)
            const dot = worldDir.dot(new THREE.Vector3(0, 1, 0));

            if (dot > maxDot) {
                maxDot = dot;
                result = face.val;
            }
        });

        // Mapping adjustment: Standard textures usually map differently?
        // Let's assume the texture array order matches the faces defined above.
        // With BoxGeometry attach="material-0" corresponds to +x, etc.
        // So texture 1 is +x, texture 3 is +y.

        // However, usually "Up" face is the one showing.
        // If Face "3" (+Y) is facing Up (0,1,0), then 3 is the result.
        // BUT, if the dice flips, any face can be Up.
        // The logic above finds which LOCAL face is currently pointing Globally UP.
        // So if local +X (Val 1) is pointing UP, the result is 1. Correct.

        onRollComplete(result);
    };

    return (
        <mesh ref={ref} castShadow>
            <boxGeometry args={[2, 2, 2]} />
            {/* Array of materials for each face */}
            {textures.map((texture, i) => (
                <meshStandardMaterial
                    key={i}
                    attach={`material-${i}`}
                    map={texture}
                    roughness={0.4}
                />
            ))}
        </mesh>
    );
};

// --- Main Scene Component ---

const DiceArena = ({ onResult }) => {
    const [rollTrigger, setRollTrigger] = useState(0);
    const [result, setResult] = useState(null);
    const [isRolling, setIsRolling] = useState(false);

    const handleRoll = () => {
        setIsRolling(true);
        setResult(null);
        setRollTrigger(prev => prev + 1); // Trigger effect
    };

    const handleComplete = (value) => {
        setIsRolling(false);
        setResult(value);
        if (onResult) onResult(value);
        console.log("Rolled:", value);
    };

    return (
        <div style={{ width: '100%', height: '500px', position: 'relative', background: '#0f0a1e' }}>
            {/* UI Overlay */}
            <div style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
                <button
                    onClick={handleRoll}
                    disabled={isRolling}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #7b2cbf, #9d4edd)',
                        color: 'white', border: 'none', borderRadius: '8px',
                        cursor: isRolling ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(123, 44, 191, 0.5)'
                    }}
                >
                    {isRolling ? 'Rolando...' : 'ROLAR DADOS'}
                </button>

                {result && (
                    <div style={{
                        fontSize: '2rem', color: '#ffcf33', fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(255, 207, 51, 0.5)'
                    }}>
                        Resultado: {result}
                    </div>
                )}
            </div>

            {/* 3D Scene */}
            <Canvas shadows camera={{ position: [0, 10, 10], fov: 45 }}>
                {/* Lighting: Tavern Atmosphere */}
                <ambientLight intensity={0.3} color="#4a4069" />
                <pointLight
                    position={[5, 10, 5]}
                    intensity={1.5}
                    color="#ffaa00" // Warm torch light
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[-5, 5, -5]} intensity={0.5} color="#9d4edd" /> // Magic ambiance

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <Physics gravity={[0, -20, 0]} defaultContactMaterial={{ restitution: 0.5 }}>
                    <Dice
                        triggerRoll={rollTrigger}
                        onRollComplete={handleComplete}
                    />
                    <Floor />
                </Physics>

                <OrbitControls
                    enableZoom={false}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.5} // Don't allow going below floor
                />
            </Canvas>
        </div>
    );
};

export default DiceArena;
